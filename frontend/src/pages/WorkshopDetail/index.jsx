import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loading, ErrorState } from '../../components/admin/AdminShell';
import { toast, errMsg } from '../../components/Toast';
import { workshopService } from '../../services/workshopService';
import { useAuth } from '../../context/AuthContext';
import { inr } from '../../utils/format';

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function WorkshopDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [workshop, setWorkshop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(false);

  const [participants, setParticipants] = useState(1);
  const [slotIndex, setSlotIndex] = useState('');
  const [customDate, setCustomDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await workshopService.getById(id);
      setWorkshop(res.data.workshop);
    } catch (err) {
      const message = errMsg(err, 'Failed to load workshop');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const seatsLeft = workshop
    ? (workshop.seatsLeft ?? Math.max(0, workshop.maxParticipants - workshop.currentParticipants))
    : 0;

  const upcomingSlots = useMemo(() => {
    if (!workshop?.schedule) return [];
    return workshop.schedule
      .map((slot, index) => ({ ...slot, index }))
      .filter((slot) => slot.date && new Date(slot.date).getTime() > Date.now())
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [workshop]);

  const isOwnWorkshop = !!user && !!workshop?.artisan?.user && String(workshop.artisan.user) === String(user._id);
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  useEffect(() => {
    setParticipants(1);
    setSlotIndex(upcomingSlots.length ? '0' : '');
    setCustomDate('');
    setStartTime('');
    setEndTime('');
  }, [upcomingSlots.length, id]);

  const canBook =
    workshop &&
    workshop.isActive &&
    seatsLeft > 0 &&
    !isOwnWorkshop;

  const book = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/auth', { state: { from: { pathname: `/workshop/${id}` } } });
      return;
    }

    const count = Number(participants);
    if (!Number.isInteger(count) || count < 1) {
      toast.error('Pick at least 1 participant');
      return;
    }
    if (count > seatsLeft) {
      toast.error(`Only ${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} left`);
      return;
    }

    let body;
    if (slotIndex !== '') {
      const slot = upcomingSlots.find((s) => String(s.index) === String(slotIndex));
      if (!slot) {
        toast.error('Pick a valid session');
        return;
      }
      body = { scheduleDate: slot.date, startTime: slot.startTime, endTime: slot.endTime, participants: count };
    } else {
      if (!customDate) {
        toast.error('Pick a workshop date');
        return;
      }
      if (!startTime || !endTime) {
        toast.error('Start time and end time are required');
        return;
      }
      body = { scheduleDate: customDate, startTime, endTime, participants: count };
    }

    setBooking(true);
    try {
      const res = await workshopService.book(id, body);
      toast.success(res.data?.message || 'Booking confirmed — pay at the venue');
      navigate('/my-bookings');
    } catch (err) {
      toast.error(errMsg(err, 'Failed to book workshop'));
      load();
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 py-8">
        <div className="max-w-5xl mx-auto px-4"><Loading /></div>
      </div>
    );
  }

  if (error || !workshop) {
    return (
      <div className="min-h-screen bg-amber-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <ErrorState message={error || 'Workshop not found'} />
          <div className="text-center mt-4">
            <Link to="/workshops" className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm">
              Back to Workshops
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <Link to="/workshops" className="text-sm text-amber-700 hover:text-amber-900">← Back to Workshops</Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          <div className="md:col-span-2 bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-amber-100 h-56 flex items-center justify-center text-7xl overflow-hidden">
              {workshop.images?.[0] ? (
                <img src={workshop.images[0]} alt={workshop.title} className="w-full h-full object-cover" />
              ) : (
                <span>🧵</span>
              )}
            </div>
            <div className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h1 className="text-2xl font-bold text-amber-900">{workshop.title}</h1>
                <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                  {workshop.level}
                </span>
              </div>

              {workshop.artisan && (
                <Link
                  to={`/artisan/${workshop.artisan._id}`}
                  className="inline-block mt-2 text-amber-700 hover:text-amber-900 font-medium"
                >
                  by {workshop.artisan.businessName}
                  {workshop.artisan.rating > 0 ? ` · ${Number(workshop.artisan.rating).toFixed(1)} ★` : ''}
                </Link>
              )}

              <p className="text-sm text-amber-600 mt-1">
                ⏱️ {workshop.duration} {workshop.durationUnit} · 🌐 {workshop.language || 'English'} ·
                {' '}{workshop.location?.type || 'online'}
                {workshop.location?.city ? ` · ${workshop.location.city}` : ''}
                {workshop.location?.state ? `, ${workshop.location.state}` : ''}
              </p>
              {workshop.location?.address && (
                <p className="text-sm text-amber-600 mt-1">📍 {workshop.location.address}</p>
              )}

              <p className="text-amber-800 mt-4 whitespace-pre-line">{workshop.description}</p>

              {workshop.materials?.length > 0 && (
                <div className="mt-6">
                  <h2 className="font-bold text-amber-900 mb-2">Materials</h2>
                  <ul className="space-y-1 text-sm text-amber-700">
                    {workshop.materials.map((material, i) => (
                      <li key={i}>
                        • <span className="font-medium">{material.name}</span>
                        {material.description ? ` — ${material.description}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {upcomingSlots.length > 0 && (
                <div className="mt-6">
                  <h2 className="font-bold text-amber-900 mb-2">Upcoming Sessions</h2>
                  <ul className="space-y-1 text-sm text-amber-700">
                    {upcomingSlots.map((slot) => (
                      <li key={slot.index}>
                        📅 {formatDate(slot.date)} · {slot.startTime} – {slot.endTime}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 h-fit">
            <p className="text-3xl font-bold text-amber-900">{inr(workshop.price)}</p>
            <p className="text-sm text-amber-600 mt-1">per participant · pay at the venue</p>

            <div className="mt-4 text-sm text-amber-800">
              {seatsLeft > 0 ? (
                <span className="text-green-700 font-medium">{seatsLeft} seat{seatsLeft === 1 ? '' : 's'} left</span>
              ) : (
                <span className="text-red-600 font-medium">Sold out</span>
              )}
              <div className="w-full bg-amber-200 rounded-full h-2 mt-2">
                <div
                  className="bg-amber-600 h-2 rounded-full"
                  style={{ width: `${Math.min(100, ((workshop.currentParticipants || 0) / (workshop.maxParticipants || 1)) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-amber-500 mt-1">
                {workshop.currentParticipants || 0} / {workshop.maxParticipants} enrolled
              </p>
            </div>

            {!workshop.isActive && (
              <p className="mt-4 text-sm text-red-600 font-medium">This workshop is not open for booking.</p>
            )}

            {isOwnWorkshop && (
              <div className="mt-4">
                <p className="text-sm text-amber-700">This is your workshop.</p>
                <Link to="/artisan/workshops" className="inline-block mt-2 text-sm text-amber-700 hover:underline">
                  Manage it in My Workshops →
                </Link>
              </div>
            )}

            {canBook && (
              <form onSubmit={book} className="mt-4 space-y-3">
                {upcomingSlots.length > 0 ? (
                  <label className="block text-sm text-amber-800">
                    Session
                    <select
                      value={slotIndex}
                      onChange={(e) => setSlotIndex(e.target.value)}
                      className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
                    >
                      {upcomingSlots.map((slot) => (
                        <option key={slot.index} value={slot.index}>
                          {formatDate(slot.date)} · {slot.startTime}–{slot.endTime}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <>
                    <label className="block text-sm text-amber-800">
                      Date *
                      <input
                        type="date"
                        required
                        min={tomorrow}
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block text-sm text-amber-800">
                        Start *
                        <input
                          type="time"
                          required
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="block text-sm text-amber-800">
                        End *
                        <input
                          type="time"
                          required
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
                        />
                      </label>
                    </div>
                  </>
                )}

                <label className="block text-sm text-amber-800">
                  Participants
                  <select
                    value={participants}
                    onChange={(e) => setParticipants(Number(e.target.value))}
                    className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
                  >
                    {Array.from({ length: seatsLeft }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>

                <p className="text-sm text-amber-700">
                  Total: <span className="font-bold">{inr(workshop.price * Number(participants || 0))}</span>
                </p>

                <button
                  type="submit"
                  disabled={booking}
                  className="w-full px-4 py-2 bg-amber-700 text-white rounded-lg text-sm hover:bg-amber-800 transition disabled:opacity-50"
                >
                  {booking ? 'Booking...' : isAuthenticated ? 'Book Now' : 'Sign in to Book'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkshopDetail;
