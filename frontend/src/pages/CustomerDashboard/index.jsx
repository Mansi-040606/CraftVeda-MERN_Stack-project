import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { artisanApplicationService } from '../../services/artisanApplicationService';
import { orderService } from '../../services/orderService';
import { donationService } from '../../services/donationService';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/order/OrderStatus';
import { inr } from '../../utils/format';

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const CustomerDashboard = () => {
  const { user } = useAuth();
  const { cartCount, wishlist } = useCart();

  const [applicationStatus, setApplicationStatus] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [donationsCount, setDonationsCount] = useState(0);
  const [donationsAmount, setDonationsAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadDashboard = async () => {
      setLoading(true);
      const [appRes, ordersRes, donationsRes] = await Promise.allSettled([
        artisanApplicationService.getMyApplication(),
        orderService.getAll({ page: 1, limit: 5 }),
        donationService.getMine(),
      ]);

      if (!active) return;

      if (appRes.status === 'fulfilled' && appRes.value.data?.success) {
        setApplicationStatus(appRes.value.data.application?.status || null);
      }
      if (ordersRes.status === 'fulfilled' && ordersRes.value.data?.success) {
        setOrders(ordersRes.value.data.orders || []);
        setOrdersTotal(ordersRes.value.data.total ?? (ordersRes.value.data.orders || []).length);
      }
      if (donationsRes.status === 'fulfilled' && donationsRes.value.data?.success) {
        setDonationsCount(donationsRes.value.data.total ?? 0);
        setDonationsAmount(donationsRes.value.data.completedTotal ?? 0);
      }
      setLoading(false);
    };

    loadDashboard();
    return () => { active = false; };
  }, []);

  const stats = [
    { label: 'My Orders', value: ordersTotal, emoji: '📦', link: '/orders' },
    { label: 'Wishlist', value: wishlist.length, emoji: '❤️', link: '/wishlist' },
    { label: 'Cart Items', value: cartCount, emoji: '🛒', link: '/cart' },
    {
      label: donationsAmount > 0 ? `Donations (${inr(donationsAmount)})` : 'Donations',
      value: donationsCount,
      emoji: '💝',
      link: '/donate',
    },
  ];

  return (
    <div className="min-h-screen bg-cream py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-ink mb-1">Welcome, {user?.name}!</h1>
            <p className="text-terracotta-dark">Customer Dashboard</p>
          </div>
          <Link
            to="/profile"
            className="px-4 py-2 bg-white border border-ink/15 rounded-sm text-sm font-medium text-ink hover:bg-parchment transition"
          >
            Edit Profile &amp; Address
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              to={stat.link}
              className="bg-white rounded-sm border border-ink/10 p-4 text-center hover:shadow-lg transition"
            >
              <span className="text-3xl">{stat.emoji}</span>
              <p className="text-2xl font-bold text-ink mt-2">{stat.value}</p>
              <p className="text-sm text-ink-soft">{stat.label}</p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-sm border border-ink/10 p-6">
            <h2 className="font-bold text-ink mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/products" className="bg-parchment text-ink-soft p-4 rounded-sm hover:bg-linen transition text-center">
                Browse Products
              </Link>
              <Link to="/artisans" className="bg-parchment text-ink-soft p-4 rounded-sm hover:bg-linen transition text-center">
                Explore Artisans
              </Link>
              <Link to="/workshops" className="bg-parchment text-ink-soft p-4 rounded-sm hover:bg-linen transition text-center">
                Join Workshops
              </Link>
              <Link to="/my-bookings" className="bg-parchment text-ink-soft p-4 rounded-sm hover:bg-linen transition text-center">
                My Bookings
              </Link>
              <Link to="/gi-search" className="bg-parchment text-ink-soft p-4 rounded-sm hover:bg-linen transition text-center">
                Search GI Tags
              </Link>
              <Link to="/verify" className="bg-parchment text-ink-soft p-4 rounded-sm hover:bg-linen transition text-center">
                Verify Certificate
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-sm border border-ink/10 p-6">
            <h2 className="font-bold text-ink mb-4">Become an Artisan</h2>
            {applicationStatus ? (
              <div className="bg-cream rounded-sm p-4">
                <p className="text-ink-soft">
                  Your application status:{' '}
                  <span
                    className={`font-bold ${
                      applicationStatus === 'PENDING'
                        ? 'text-yellow-600'
                        : applicationStatus === 'APPROVED'
                          ? 'text-green-600'
                          : 'text-red-600'
                    }`}
                  >
                    {applicationStatus}
                  </span>
                </p>
                {applicationStatus === 'REJECTED' && (
                  <Link to="/become-artisan" className="mt-2 inline-block text-terracotta-dark hover:underline">
                    Apply again
                  </Link>
                )}
              </div>
            ) : (
              <div>
                <p className="text-terracotta-dark mb-4">
                  Have a craft business? Apply to become an artisan and showcase your products.
                </p>
                <Link
                  to="/become-artisan"
                  className="inline-block bg-terracotta text-white px-6 py-2 rounded-sm hover:bg-terracotta-dark transition"
                >
                  Apply Now
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-sm border border-ink/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-ink">Recent Orders</h2>
            {orders.length > 0 && (
              <Link to="/orders" className="text-sm text-terracotta-dark hover:underline">
                View all ({ordersTotal}) →
              </Link>
            )}
          </div>

          {loading ? (
            <p className="text-ink-soft text-center py-6">Loading your recent orders…</p>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-ink-soft mb-3">No orders yet. Start shopping!</p>
              <Link
                to="/products"
                className="inline-block bg-terracotta text-white px-5 py-2 rounded-sm text-sm hover:bg-terracotta-dark transition"
              >
                Explore Crafts
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-ink/10">
              {orders.map((order) => (
                <div key={order._id} className="py-3 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <Link
                      to={`/order/${order._id}`}
                      className="font-semibold text-ink hover:text-terracotta-dark"
                    >
                      Order #{String(order._id).slice(-6).toUpperCase()}
                    </Link>
                    <p className="text-xs text-ink-soft">
                      {formatDate(order.createdAt)} · {(order.items || []).length} item
                      {(order.items || []).length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={order.orderStatus} />
                    <PaymentStatusBadge status={order.paymentStatus} />
                    <span className="font-semibold text-ink">{inr(order.total)}</span>
                    <Link
                      to={`/order/${order._id}`}
                      className="text-sm text-terracotta-dark hover:underline"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
