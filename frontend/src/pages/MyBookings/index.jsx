import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loading, ErrorState, EmptyState } from '../../components/admin/AdminShell';
import { toast, errMsg } from '../../components/Toast';
import { workshopService } from '../../services/workshopService';
import { runRazorpayPayment } from '../../services/orderService';
import { useAuth } from '../../context/AuthContext';
import ProductImage from '../../components/product/ProductImage';
import { inr } from '../../utils/format';

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const STATUS_STYLES = {
  booked: 'bg-green-100 text-green-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-700',
};

function MyBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [payingId, setPayingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await workshopService.getMyBookings();
      setBookings(res.data.bookings || []);
    } catch (err) {
      const message = errMsg(err, 'Failed to load your bookings');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cancel = async (booking) => {
    if (!window.confirm(`Cancel your booking for "${booking.workshop?.title || 'this workshop'}"?`)) return;
    setBusyId(booking._id);
    try {
      await workshopService.cancelBooking(booking._id);
      toast.success('Booking cancelled — seats released');
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to cancel booking'));
    } finally {
      setBusyId(null);
    }
  };

  const payBooking = async (booking) => {
    setPayingId(booking._id);
    try {
      await runRazorpayPayment({
        referenceType: 'workshop',
        referenceId: booking._id,
        description: booking.workshop?.title || 'Workshop Booking',
        user,
      });
      toast.success('Workshop payment completed!');
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Payment could not be completed'));
    } finally {
      setPayingId(null);
    }
  };

  const isPast = (date) => new Date(date).getTime() <= Date.now();

  return (
    <div className="min-h-screen bg-cream py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-ink mb-2">My Workshop Bookings</h1>
        <p className="text-terracotta-dark mb-6">Pay at the venue · cancel free before the workshop date.</p>

        {loading && <Loading />}
        {!loading && error && (
          <div>
            <ErrorState message={error} />
            <div className="text-center mt-4">
              <button onClick={load} className="px-4 py-2 bg-terracotta text-white rounded-sm text-sm">
                Retry
              </button>
            </div>
          </div>
        )}
        {!loading && !error && bookings.length === 0 && (
          <div>
            <EmptyState message="You haven't booked any workshops yet" />
            <div className="text-center mt-4">
              <Link to="/workshops" className="px-4 py-2 bg-terracotta text-white rounded-sm text-sm">
                Browse Workshops
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && bookings.length > 0 && (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const cancelled = booking.status === 'cancelled';
              const past = isPast(booking.scheduleDate);
              return (
                <div
                  key={booking._id}
                  className={`bg-white rounded-sm border border-ink/10 p-4 flex flex-wrap items-center gap-4 ${cancelled ? 'opacity-60' : ''}`}
                >
                  <div className="w-12 h-12 rounded bg-parchment overflow-hidden flex items-center justify-center shrink-0">
                    {booking.workshop?.images?.[0] ? (
                      <ProductImage
                        src={booking.workshop?.images?.[0]}
                        alt={booking.workshop?.title || 'Workshop'}
                        frame="h-full w-full"
                        w={96}
                        h={96}
                      />
                    ) : (
                      <span>🧵</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-48">
                    <Link
                      to={`/workshop/${booking.workshop?._id}`}
                      className="font-medium text-ink hover:text-terracotta-dark"
                    >
                      {booking.workshop?.title || 'Workshop'}
                    </Link>
                    <p className="text-sm text-ink-soft">
                      📅 {formatDate(booking.scheduleDate)} · {booking.startTime} – {booking.endTime}
                    </p>
                    <p className="text-sm text-ink-soft">
                      {booking.participants} participant{booking.participants === 1 ? '' : 's'} ·{' '}
                      {inr(booking.amount)} ·{' '}
                      <span className={booking.paymentStatus === 'paid' ? 'text-green-700 font-medium' : ''}>
                        {booking.amount === 0 ? 'Free' : `Payment: ${booking.paymentStatus || 'pending'}`}
                      </span>
                    </p>
                    {booking.joinLink && !cancelled && (
                      <a
                        href={booking.joinLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block mt-1 text-xs font-semibold text-terracotta-dark underline"
                      >
                        Join session link →
                      </a>
                    )}
                  </div>

                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      STATUS_STYLES[booking.status] || 'bg-parchment text-ink-soft'
                    }`}
                  >
                    {booking.status}
                  </span>

                  {!cancelled && !past && booking.amount > 0 && booking.paymentStatus !== 'paid' && (
                    <button
                      onClick={() => payBooking(booking)}
                      disabled={payingId === booking._id}
                      className="px-3 py-1.5 rounded-sm text-sm bg-terracotta text-white hover:bg-terracotta-dark transition disabled:opacity-50"
                    >
                      {payingId === booking._id ? 'Paying…' : 'Pay Online'}
                    </button>
                  )}

                  {!cancelled && !past && (
                    <button
                      onClick={() => cancel(booking)}
                      disabled={busyId === booking._id}
                      className="px-3 py-1.5 rounded-sm text-sm bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                    >
                      {busyId === booking._id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyBookings;
