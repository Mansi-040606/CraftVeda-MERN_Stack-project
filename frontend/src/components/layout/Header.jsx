import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setShowDropdown(false);
  };

  const getDashboardLink = () => {
    switch (user?.role) {
      case 'CUSTOMER':
        return '/customer/dashboard';
      case 'ARTISAN':
        return '/artisan/dashboard';
      case 'ADMIN':
        return '/admin/dashboard';
      default:
        return '/';
    }
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🏺</span>
            <span className="text-xl font-bold text-amber-900">CraftVeda</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link to="/products" className="text-amber-800 hover:text-amber-600 transition">Products</Link>
            <Link to="/artisans" className="text-amber-800 hover:text-amber-600 transition">Artisans</Link>
            <Link to="/workshops" className="text-amber-800 hover:text-amber-600 transition">Workshops</Link>
            <Link to="/gi-search" className="text-amber-800 hover:text-amber-600 transition">GI Tags</Link>
            <Link to="/about" className="text-amber-800 hover:text-amber-600 transition">Heritage</Link>
            <Link to="/donate" className="text-amber-800 hover:text-amber-600 transition">Donate</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/wishlist" className="text-amber-800 hover:text-amber-600 transition text-xl">♡</Link>
            <Link to="/cart" className="relative text-amber-800 hover:text-amber-600 transition text-xl">
              🛒
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-lg hover:bg-amber-200 transition"
                >
                  <span className="font-medium">{user?.name}</span>
                  <span className="text-sm">▼</span>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-amber-200 py-2 z-50">
                    <Link
                      to={getDashboardLink()}
                      className="block px-4 py-2 text-amber-800 hover:bg-amber-50 transition"
                      onClick={() => setShowDropdown(false)}
                    >
                      Dashboard
                    </Link>
                    
                    {user?.role === 'CUSTOMER' && (
                      <Link
                        to="/become-artisan"
                        className="block px-4 py-2 text-amber-800 hover:bg-amber-50 transition"
                        onClick={() => setShowDropdown(false)}
                      >
                        Become an Artisan
                      </Link>
                    )}
                    
                    <Link
                      to="/orders"
                      className="block px-4 py-2 text-amber-800 hover:bg-amber-50 transition"
                      onClick={() => setShowDropdown(false)}
                    >
                      My Orders
                    </Link>
                    
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-red-600 hover:bg-amber-50 transition"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/auth" className="bg-amber-700 text-white px-4 py-2 rounded-lg hover:bg-amber-800 transition">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;