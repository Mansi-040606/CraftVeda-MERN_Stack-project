import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { artisanApplicationService } from '../../services/artisanApplicationService';
import { useState, useEffect } from 'react';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [applicationStatus, setApplicationStatus] = useState(null);

  useEffect(() => {
    checkArtisanApplication();
  }, []);

  const checkArtisanApplication = async () => {
    try {
      const response = await artisanApplicationService.getMyApplication();
      if (response.data.success) {
        setApplicationStatus(response.data.application.status);
      }
    } catch (err) {
      // No application found
    }
  };

  return (
    <div className="min-h-screen bg-amber-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-amber-900 mb-2">Welcome, {user?.name}!</h1>
        <p className="text-amber-700 mb-8">Customer Dashboard</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'My Orders', value: 0, emoji: '📦', link: '/orders' },
            { label: 'Wishlist', value: 0, emoji: '❤️', link: '/wishlist' },
            { label: 'Cart', value: 0, emoji: '🛒', link: '/cart' },
            { label: 'Donations', value: 0, emoji: '💝', link: '/donate' },
          ].map(stat => (
            <Link key={stat.label} to={stat.link} className="bg-white rounded-xl shadow-md p-4 text-center hover:shadow-lg transition">
              <span className="text-3xl">{stat.emoji}</span>
              <p className="text-2xl font-bold text-amber-900 mt-2">{stat.value}</p>
              <p className="text-sm text-amber-600">{stat.label}</p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="font-bold text-amber-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/products" className="bg-amber-100 text-amber-800 p-4 rounded-lg hover:bg-amber-200 transition text-center">
                Browse Products
              </Link>
              <Link to="/artisans" className="bg-amber-100 text-amber-800 p-4 rounded-lg hover:bg-amber-200 transition text-center">
                Explore Artisans
              </Link>
              <Link to="/workshops" className="bg-amber-100 text-amber-800 p-4 rounded-lg hover:bg-amber-200 transition text-center">
                Join Workshops
              </Link>
              <Link to="/gi-search" className="bg-amber-100 text-amber-800 p-4 rounded-lg hover:bg-amber-200 transition text-center">
                Search GI Tags
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="font-bold text-amber-900 mb-4">Become an Artisan</h2>
            {applicationStatus ? (
              <div className="bg-amber-50 rounded-lg p-4">
                <p className="text-amber-800">Your application status: <span className={`font-bold ${
                  applicationStatus === 'PENDING' ? 'text-yellow-600' :
                  applicationStatus === 'APPROVED' ? 'text-green-600' :
                  'text-red-600'
                }`}>{applicationStatus}</span></p>
                {applicationStatus === 'REJECTED' && (
                  <Link to="/become-artisan" className="mt-2 inline-block text-amber-700 hover:underline">
                    Apply again
                  </Link>
                )}
              </div>
            ) : (
              <div>
                <p className="text-amber-700 mb-4">Have a craft business? Apply to become an artisan and showcase your products.</p>
                <Link to="/become-artisan" className="bg-amber-700 text-white px-6 py-2 rounded-lg hover:bg-amber-800 transition">
                  Apply Now
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="font-bold text-amber-900 mb-4">Recent Orders</h2>
          <p className="text-amber-600 text-center py-8">No orders yet. Start shopping!</p>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;