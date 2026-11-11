import { useCallback, useEffect, useState } from 'react';
import ArtisanShell from '../../components/artisan/ArtisanShell';
import { Loading, ErrorState, EmptyState } from '../../components/admin/AdminShell';
import { toast, errMsg } from '../../components/Toast';
import { workshopService } from '../../services/workshopService';
import { inr } from '../../utils/format';

const LEVELS = ['beginner', 'intermediate', 'advanced', 'all'];
const DURATION_UNITS = ['minutes', 'hours', 'days'];
const LOCATION_TYPES = ['online', 'offline', 'hybrid'];

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

const emptyForm = {
  title: '',
  description: '',
  craftType: '',
  duration: 2,
  durationUnit: 'hours',
  maxParticipants: 10,
  price: '',
  level: 'all',
  language: 'English',
  locationType: 'online',
  city: '',
  state: '',
  address: '',
  images: '',
  isActive: true,
  schedule: [],
};

const validateForm = (form) => {
  if (form.title.trim().length < 3) return 'Title must be at least 3 characters';
  if (!form.description.trim()) return 'Description is required';
  if (!form.craftType.trim()) return 'Craft type is required';
  if (Number(form.duration) < 1) return 'Duration must be at least 1';
  if (Number(form.maxParticipants) < 1) return 'Max participants must be at least 1';
  const price = Number(form.price);
  if (!Number.isFinite(price) || price < 0) return 'Price must be 0 or more';
  for (const slot of form.schedule) {
    if (!slot.date) return 'Every session needs a date';
    if (!slot.startTime || !slot.endTime) return 'Every session needs start and end times';
  }
  return null;
};

const buildPayload = (form) => ({
  title: form.title.trim(),
  description: form.description.trim(),
  craftType: form.craftType.trim(),
  duration: Number(form.duration),
  durationUnit: form.durationUnit,
  maxParticipants: Number(form.maxParticipants),
  price: Number(form.price),
  level: form.level,
  language: form.language.trim() || 'English',
  location: {
    type: form.locationType,
    city: form.city.trim(),
    state: form.state.trim(),
    address: form.address.trim(),
  },
  images: form.images.split(',').map((url) => url.trim()).filter(Boolean),
  isActive: form.isActive,
  schedule: form.schedule.map((slot) => ({ date: slot.date, startTime: slot.startTime, endTime: slot.endTime })),
});

function ArtisanWorkshops() {
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [bookingsFor, setBookingsFor] = useState(null); // workshop _id
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await workshopService.getMine();
      setWorkshops(res.data.workshops || []);
    } catch (err) {
      const message = errMsg(err, 'Failed to load your workshops');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
    setBookingsFor(null);
  };

  const openEdit = (workshop) => {
    setEditing(workshop);
    setForm({
      title: workshop.title,
      description: workshop.description,
      craftType: workshop.craftType,
      duration: workshop.duration,
      durationUnit: workshop.durationUnit || 'hours',
      maxParticipants: workshop.maxParticipants,
      price: workshop.price,
      level: workshop.level || 'all',
      language: workshop.language || 'English',
      locationType: workshop.location?.type || 'online',
      city: workshop.location?.city || '',
      state: workshop.location?.state || '',
      address: workshop.location?.address || '',
      images: (workshop.images || []).join(', '),
      isActive: workshop.isActive,
      schedule: (workshop.schedule || []).map((slot) => ({
        date: toDateInput(slot.date),
        startTime: slot.startTime || '',
        endTime: slot.endTime || '',
      })),
    });
    setShowForm(true);
    setBookingsFor(null);
  };

  const save = async (e) => {
    e.preventDefault();
    const problem = validateForm(form);
    if (problem) {
      toast.error(problem);
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(form);
      if (editing) {
        await workshopService.update(editing._id, payload);
        toast.success('Workshop updated');
      } else {
        await workshopService.create(payload);
        toast.success('Workshop created');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to save workshop'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (workshop) => {
    if (!window.confirm(`Delete "${workshop.title}"? This cannot be undone.`)) return;
    setBusyId(workshop._id);
    try {
      await workshopService.remove(workshop._id);
      toast.success('Workshop deleted');
      if (bookingsFor === workshop._id) setBookingsFor(null);
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to delete workshop'));
    } finally {
      setBusyId(null);
    }
  };

  const toggleBookings = async (workshop) => {
    if (bookingsFor === workshop._id) {
      setBookingsFor(null);
      return;
    }
    setBookingsFor(workshop._id);
    setBookingsLoading(true);
    setBookings([]);
    try {
      const res = await workshopService.getMineBookings(workshop._id);
      setBookings(res.data.bookings || []);
    } catch (err) {
      toast.error(errMsg(err, 'Failed to load bookings'));
      setBookingsFor(null);
    } finally {
      setBookingsLoading(false);
    }
  };

  const addSlot = () => {
    setForm((prev) => ({ ...prev, schedule: [...prev.schedule, { date: '', startTime: '', endTime: '' }] }));
  };

  const updateSlot = (index, key, value) => {
    setForm((prev) => {
      const schedule = [...prev.schedule];
      schedule[index] = { ...schedule[index], [key]: value };
      return { ...prev, schedule };
    });
  };

  const removeSlot = (index) => {
    setForm((prev) => ({ ...prev, schedule: prev.schedule.filter((_, i) => i !== index) }));
  };

  return (
    <ArtisanShell
      title="My Workshops"
      actions={
        <div className="flex items-center gap-3">
          <span className="text-sm text-amber-600">{workshops.length} workshops</span>
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm hover:bg-amber-800 transition"
          >
            Add Workshop
          </button>
        </div>
      }
    >
      {showForm && (
        <form onSubmit={save} className="bg-white rounded-xl shadow-md p-6 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <h2 className="font-bold text-amber-900 md:col-span-2">
            {editing ? 'Edit Workshop' : 'Add Workshop'}
          </h2>

          <label className="text-sm text-amber-800">
            Title *
            <input
              required
              minLength={3}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-amber-800">
            Craft type *
            <input
              required
              placeholder="e.g. Block Printing"
              value={form.craftType}
              onChange={(e) => setForm({ ...form, craftType: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-amber-800 md:col-span-2">
            Description *
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-amber-800">
            Duration *
            <div className="flex gap-2 mt-1">
              <input
                required
                type="number"
                min="1"
                step="1"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="w-24 border border-amber-200 rounded-lg px-3 py-2 text-sm"
              />
              <select
                value={form.durationUnit}
                onChange={(e) => setForm({ ...form, durationUnit: e.target.value })}
                className="flex-1 border border-amber-200 rounded-lg px-3 py-2 text-sm"
              >
                {DURATION_UNITS.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </label>

          <label className="text-sm text-amber-800">
            Price (₹) *
            <input
              required
              type="number"
              min="0"
              step="1"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-amber-800">
            Max participants *
            <input
              required
              type="number"
              min="1"
              step="1"
              value={form.maxParticipants}
              onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-amber-800">
            Level
            <select
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            >
              {LEVELS.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-amber-800">
            Language
            <input
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-amber-800">
            Mode
            <select
              value={form.locationType}
              onChange={(e) => setForm({ ...form, locationType: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            >
              {LOCATION_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-amber-800">
            City
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-amber-800">
            State
            <input
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-amber-800 md:col-span-2">
            Address
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-amber-800 md:col-span-2">
            Image URLs
            <input
              placeholder="https://... (comma-separate for several)"
              value={form.images}
              onChange={(e) => setForm({ ...form, images: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-amber-800 font-medium">Sessions</span>
              <button
                type="button"
                onClick={addSlot}
                className="text-sm text-amber-700 hover:text-amber-900"
              >
                + Add session
              </button>
            </div>
            {form.schedule.length === 0 && (
              <p className="text-xs text-amber-500">
                No sessions yet — customers will pick their own date when booking.
              </p>
            )}
            <div className="space-y-2">
              {form.schedule.map((slot, index) => (
                <div key={index} className="flex flex-wrap gap-2 items-center">
                  <input
                    type="date"
                    value={slot.date}
                    onChange={(e) => updateSlot(index, 'date', e.target.value)}
                    className="border border-amber-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => updateSlot(index, 'startTime', e.target.value)}
                    className="border border-amber-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => updateSlot(index, 'endTime', e.target.value)}
                    className="border border-amber-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeSlot(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-amber-800">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active (visible for booking)
          </label>

          <div className="flex gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Workshop'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && <Loading />}
      {!loading && error && (
        <div>
          <ErrorState message={error} />
          <div className="text-center mt-4">
            <button onClick={load} className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm">
              Retry
            </button>
          </div>
        </div>
      )}
      {!loading && !error && workshops.length === 0 && (
        <EmptyState message="You have no workshops yet — add your first one" />
      )}

      {!loading && !error && workshops.length > 0 && (
        <div className="space-y-4">
          {workshops.map((workshop) => (
            <div key={workshop._id} className="bg-white rounded-xl shadow-md p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-amber-900">{workshop.title}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        workshop.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {workshop.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-amber-600 mt-1">
                    {workshop.craftType} · {workshop.duration} {workshop.durationUnit} ·{' '}
                    {workshop.location?.type || 'online'}
                    {workshop.location?.city ? ` · ${workshop.location.city}` : ''}
                  </p>
                  <p className="text-sm text-amber-600">
                    {inr(workshop.price)} · {workshop.seatsLeft} of {workshop.maxParticipants} seats left ·{' '}
                    {workshop.bookingCount || 0} booking{(workshop.bookingCount || 0) === 1 ? '' : 's'}
                  </p>
                </div>

                <div className="flex gap-3 text-sm shrink-0">
                  <button
                    onClick={() => toggleBookings(workshop)}
                    className="text-amber-700 hover:text-amber-900"
                  >
                    {bookingsFor === workshop._id ? 'Hide Bookings' : 'Bookings'}
                  </button>
                  <button
                    onClick={() => openEdit(workshop)}
                    className="text-amber-700 hover:text-amber-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(workshop)}
                    disabled={busyId === workshop._id}
                    className="text-red-600 hover:text-red-800 disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {workshop.schedule?.length > 0 && (
                <p className="text-xs text-amber-500 mt-2">
                  Sessions: {workshop.schedule.map((slot) => formatDate(slot.date)).join(', ')}
                </p>
              )}

              {bookingsFor === workshop._id && (
                <div className="mt-4 border-t border-amber-100 pt-4">
                  <h4 className="text-sm font-bold text-amber-900 mb-2">
                    Bookings for “{workshop.title}”
                  </h4>
                  {bookingsLoading && <Loading />}
                  {!bookingsLoading && bookings.length === 0 && (
                    <p className="text-sm text-amber-600">No bookings yet.</p>
                  )}
                  {!bookingsLoading && bookings.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-amber-600 border-b border-amber-100">
                            <th className="p-2">Customer</th>
                            <th className="p-2">Seats</th>
                            <th className="p-2">Date</th>
                            <th className="p-2">Time</th>
                            <th className="p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookings.map((booking) => (
                            <tr key={booking._id} className="border-b border-amber-50">
                              <td className="p-2">
                                <div className="font-medium text-amber-900">{booking.name}</div>
                                {booking.email && (
                                  <div className="text-xs text-amber-500">{booking.email}</div>
                                )}
                              </td>
                              <td className="p-2 text-amber-800">{booking.seats}</td>
                              <td className="p-2 text-amber-800">{formatDate(booking.date)}</td>
                              <td className="p-2 text-amber-800">
                                {booking.startTime} – {booking.endTime}
                              </td>
                              <td className="p-2">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs ${
                                    booking.status === 'cancelled'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-green-100 text-green-800'
                                  }`}
                                >
                                  {booking.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </ArtisanShell>
  );
}

export default ArtisanWorkshops;
