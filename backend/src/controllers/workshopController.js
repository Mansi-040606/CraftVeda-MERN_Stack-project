import Workshop from '../models/Workshop.js';
import WorkshopBooking from '../models/WorkshopBooking.js';
import Artisan from '../models/Artisan.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

const ARTISAN_SELECT = 'businessName profileImage rating user';

// Fields a client may set on create/update. Everything else (artisan,
// currentParticipants, rating, ...) stays server-owned.
const WRITABLE_FIELDS = [
  'title', 'description', 'craftType', 'duration', 'durationUnit',
  'maxParticipants', 'price', 'images', 'videoUrl', 'schedule',
  'materials', 'level', 'language', 'location', 'isActive'
];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Load the Artisan profile of the logged-in user.
const getOwnArtisan = async (user) => {
  const artisan = await Artisan.findOne({ user: user._id });
  if (!artisan) throw new ApiError(403, 'You need an artisan profile to manage workshops');
  return artisan;
};

// Load a workshop and verify the logged-in artisan owns it.
const findOwnedWorkshop = async (req) => {
  const workshop = await Workshop.findById(req.params.id);
  if (!workshop) throw new ApiError(404, 'Workshop not found');
  const artisan = await getOwnArtisan(req.user);
  if (!workshop.artisan.equals(artisan._id)) {
    throw new ApiError(403, 'You can only manage your own workshops');
  }
  return workshop;
};

// Attach a computed seatsLeft to a workshop payload.
const withSeatsLeft = (workshop) => {
  const obj = workshop.toObject ? workshop.toObject() : { ...workshop };
  obj.seatsLeft = Math.max(0, (obj.maxParticipants || 0) - (obj.currentParticipants || 0));
  return obj;
};

const pickWritable = (body) => {
  const data = {};
  for (const key of WRITABLE_FIELDS) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  return data;
};

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

// GET /api/workshops — public list of active workshops.
export const listWorkshops = catchAsync(async (req, res) => {
  const { page = 1, limit = 12, craftType, level, location, city, search, from, to } = req.query;

  const query = { isActive: true };
  if (craftType) query.craftType = craftType;
  if (level) query.level = level;
  if (location) query['location.type'] = location;
  if (city) query['location.city'] = new RegExp(escapeRegex(city), 'i');
  if (search) {
    // Regex search (the Workshop model has no text index, so $text would 500).
    const regex = new RegExp(escapeRegex(search), 'i');
    query.$or = [{ title: regex }, { craftType: regex }, { description: regex }];
  }
  if (from || to) {
    // Match workshops with at least one schedule slot inside the window.
    const window = {};
    if (from) window.$gte = new Date(from);
    if (to) window.$lte = new Date(to);
    query['schedule.date'] = window;
  }

  const total = await Workshop.countDocuments(query);
  const workshops = await Workshop.find(query)
    .populate('artisan', ARTISAN_SELECT)
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    success: true,
    workshops: workshops.map(withSeatsLeft),
    page: Number(page),
    pages: Math.ceil(total / limit),
    total
  });
});

// GET /api/workshops/admin — admin list (all statuses, regex search).
export const adminListWorkshops = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const query = {};
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    query.$or = [{ title: regex }, { craftType: regex }];
  }

  const total = await Workshop.countDocuments(query);
  const workshops = await Workshop.find(query)
    .populate('artisan', 'businessName profileImage')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({ success: true, workshops, page: Number(page), pages: Math.ceil(total / limit), total });
});

// PATCH /api/workshops/:id — admin toggles isActive.
export const adminToggleActive = catchAsync(async (req, res) => {
  if (req.body.isActive === undefined) throw new ApiError(400, 'isActive is required');
  const workshop = await Workshop.findByIdAndUpdate(
    req.params.id,
    { isActive: req.body.isActive },
    { new: true, runValidators: true }
  );
  if (!workshop) throw new ApiError(404, 'Workshop not found');
  res.json({ success: true, workshop });
});

// GET /api/workshops/mine — artisan's own workshops with booking counts.
export const listMine = catchAsync(async (req, res) => {
  const artisan = await getOwnArtisan(req.user);
  const workshops = await Workshop.find({ artisan: artisan._id }).sort('-createdAt');

  const counts = await WorkshopBooking.aggregate([
    { $match: { workshop: { $in: workshops.map((w) => w._id) }, status: { $ne: 'cancelled' } } },
    { $group: { _id: '$workshop', bookingCount: { $sum: 1 }, seatsBooked: { $sum: '$participants' } } }
  ]);
  const countByWorkshop = new Map(counts.map((row) => [String(row._id), row]));

  res.json({
    success: true,
    workshops: workshops.map((workshop) => {
      const shaped = withSeatsLeft(workshop);
      const row = countByWorkshop.get(String(workshop._id));
      shaped.bookingCount = row ? row.bookingCount : 0;
      shaped.seatsBooked = row ? row.seatsBooked : 0;
      return shaped;
    }),
    total: workshops.length
  });
});

// POST /api/workshops/mine — artisan creates a workshop.
export const createWorkshop = catchAsync(async (req, res) => {
  const artisan = await getOwnArtisan(req.user);
  const workshop = await Workshop.create({
    ...pickWritable(req.body),
    artisan: artisan._id,
    currentParticipants: 0
  });
  res.status(201).json({ success: true, workshop: withSeatsLeft(workshop) });
});

// GET /api/workshops/mine/:id/bookings — who booked my workshop.
export const listMineWorkshopBookings = catchAsync(async (req, res) => {
  const workshop = await findOwnedWorkshop(req);
  const bookings = await WorkshopBooking.find({ workshop: workshop._id })
    .populate('user', 'name email')
    .sort('-scheduleDate');

  res.json({
    success: true,
    workshop: { _id: workshop._id, title: workshop.title },
    bookings: bookings.map((booking) => ({
      _id: booking._id,
      name: booking.user?.name || 'Customer',
      email: booking.user?.email || null,
      seats: booking.participants,
      date: booking.scheduleDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      amount: booking.amount,
      status: booking.status
    }))
  });
});

// PUT /api/workshops/mine/:id — artisan updates their own workshop.
export const updateWorkshop = catchAsync(async (req, res) => {
  const workshop = await findOwnedWorkshop(req);
  const updates = pickWritable(req.body);

  if (
    updates.maxParticipants !== undefined &&
    Number(updates.maxParticipants) < workshop.currentParticipants
  ) {
    throw new ApiError(
      400,
      `Max participants cannot be below the ${workshop.currentParticipants} seat(s) already booked`
    );
  }

  const updated = await Workshop.findByIdAndUpdate(workshop._id, updates, {
    new: true,
    runValidators: true
  });
  res.json({ success: true, workshop: withSeatsLeft(updated) });
});

// DELETE /api/workshops/mine/:id — blocked while bookings exist.
// (The artisan can deactivate instead via PUT with isActive=false.)
export const deleteWorkshop = catchAsync(async (req, res) => {
  const workshop = await findOwnedWorkshop(req);

  const activeBookings = await WorkshopBooking.countDocuments({
    workshop: workshop._id,
    status: { $ne: 'cancelled' }
  });
  if (activeBookings > 0) {
    throw new ApiError(
      400,
      `Cannot delete: ${activeBookings} booking(s) exist. Deactivate the workshop instead.`
    );
  }

  await Workshop.findByIdAndDelete(workshop._id);
  res.json({ success: true, message: 'Workshop deleted' });
});

// GET /api/workshops/my-bookings — the logged-in user's own bookings.
export const listMyBookings = catchAsync(async (req, res) => {
  const bookings = await WorkshopBooking.find({ user: req.user._id })
    .populate('workshop', 'title images craftType price location maxParticipants');

  res.json({ success: true, bookings });
});

// DELETE /api/workshops/bookings/:id — cancel own booking, seats restored.
export const cancelBooking = catchAsync(async (req, res) => {
  const booking = await WorkshopBooking.findOne({ _id: req.params.id, user: req.user._id });
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.status === 'cancelled') throw new ApiError(400, 'Booking is already cancelled');
  if (new Date(booking.scheduleDate).getTime() <= Date.now()) {
    throw new ApiError(400, 'Bookings can only be cancelled before the workshop date');
  }

  booking.status = 'cancelled';
  await booking.save();

  // Give the seats back (atomic decrement, then clamp at zero as a safety net).
  await Workshop.updateOne(
    { _id: booking.workshop },
    { $inc: { currentParticipants: -booking.participants } }
  );
  await Workshop.updateOne(
    { _id: booking.workshop, currentParticipants: { $lt: 0 } },
    { $set: { currentParticipants: 0 } }
  );

  res.json({ success: true, message: 'Booking cancelled', booking });
});

// GET /api/workshops/:id — public workshop detail.
export const getWorkshop = catchAsync(async (req, res) => {
  const workshop = await Workshop.findById(req.params.id)
    .populate('artisan', ARTISAN_SELECT);

  if (!workshop) throw new ApiError(404, 'Workshop not found');

  res.json({ success: true, workshop: withSeatsLeft(workshop) });
});

// POST /api/workshops/:id/book — book seats (pay at venue, no online payment).
export const bookWorkshop = catchAsync(async (req, res) => {
  const { scheduleDate, startTime, endTime, participants } = req.body;

  const workshop = await Workshop.findById(req.params.id).populate('artisan', 'user businessName');
  if (!workshop) throw new ApiError(404, 'Workshop not found');
  if (!workshop.isActive) throw new ApiError(400, 'This workshop is no longer accepting bookings');

  const date = new Date(scheduleDate);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, 'Schedule date must be a valid date');
  if (date.getTime() <= Date.now()) throw new ApiError(400, 'Cannot book a workshop in the past');

  // An artisan can never book their own workshop.
  if (workshop.artisan?.user && String(workshop.artisan.user) === String(req.user._id)) {
    throw new ApiError(403, 'You cannot book your own workshop');
  }

  // One booking per user per workshop (cancelled ones don't count).
  const existing = await WorkshopBooking.findOne({
    workshop: workshop._id,
    user: req.user._id,
    status: { $ne: 'cancelled' }
  });
  if (existing) throw new ApiError(400, 'You have already booked this workshop');

  // Times: explicit from the client, else taken from the matching schedule slot.
  const slot = (workshop.schedule || []).find((s) => s.date && sameDay(s.date, date));
  const finalStart = startTime || slot?.startTime;
  const finalEnd = endTime || slot?.endTime;
  if (!finalStart || !finalEnd) {
    throw new ApiError(400, 'Start time and end time are required');
  }

  // Atomic seat decrement: only succeeds while seats remain, no overbooking.
  const seats = Math.floor(participants);
  const updated = await Workshop.findOneAndUpdate(
    {
      _id: workshop._id,
      isActive: true,
      currentParticipants: { $lte: workshop.maxParticipants - seats }
    },
    { $inc: { currentParticipants: seats } },
    { new: true }
  );
  if (!updated) throw new ApiError(400, 'Not enough spots available');

  let booking;
  try {
    // Price is always server-side (workshop.price * seats). Pay at venue.
    booking = await WorkshopBooking.create({
      workshop: workshop._id,
      user: req.user._id,
      scheduleDate: date,
      startTime: finalStart,
      endTime: finalEnd,
      participants: seats,
      amount: workshop.price * seats
    });
  } catch (err) {
    // Booking failed after the seats were taken — give them back.
    await Workshop.updateOne(
      { _id: workshop._id },
      { $inc: { currentParticipants: -seats } }
    );
    throw err;
  }

  res.status(201).json({
    success: true,
    booking,
    message: 'Booking confirmed — pay at the venue'
  });
});
