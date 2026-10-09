import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ArtisanDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-amber-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-amber-900 mb-2">Welcome, {user?.name}!</h1>
        <p className="text-amber-700 mb-8">Artisan Dashboard</p>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Products', value: 0, emoji: '📦' },
            { label: 'Orders', value: 0, emoji: '🛒' },
            { label: 'Workshops', value: 0, emoji: '🎓' },
            { label: 'Reviews', value: 0, emoji: '⭐' },
            { label: 'Earnings', value: '₹0', emoji: '💰' },
            { label: 'Views', value: 0, emoji: '👁️' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl shadow-md p-4 text-center">
              <span className="text-3xl">{stat.emoji}</span>
              <p className="text-2xl font-bold text-amber-900 mt-2">{stat.value}</p>
              <p className="text-sm text-amber-600">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="font-bold text-amber-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <button className="bg-amber-100 text-amber-800 p-4 rounded-lg hover:bg-amber-200 transition text-center">
                Add Product
              </button>
              <button className="bg-amber-100 text-amber-800 p-4 rounded-lg hover:bg-amber-200 transition text-center">
                Create Workshop
              </button>
              <Link to="/artisan/profile" className="bg-amber-100 text-amber-800 p-4 rounded-lg hover:bg-amber-200 transition text-center">
                Edit Profile
              </Link>
              <Link to="/" className="bg-amber-100 text-amber-800 p-4 rounded-lg hover:bg-amber-200 transition text-center">
                View Shop
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="font-bold text-amber-900 mb-4">Recent Orders</h2>
            <p className="text-amber-600 text-center py-8">No orders yet</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="font-bold text-amber-900 mb-4">Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-amber-50 rounded-lg p-4">
              <h3 className="font-medium text-amber-900">This Month</h3>
              <p className="text-2xl font-bold text-amber-700 mt-2">0 Sales</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <h3 className="font-medium text-amber-900">Products Listed</h3>
              <p className="text-2xl font-bold text-amber-700 mt-2">0</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <h3 className="font-medium text-amber-900">Verification Status</h3>
              <p className="text-lg font-bold text-yellow-600 mt-2">Pending</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtisanDashboard;