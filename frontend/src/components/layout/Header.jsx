import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { authService } from '../../services/authService';
import { errMsg, toast } from '../Toast';
import UploadButton from '../common/UploadButton';

const navLink =
  'text-sm font-medium uppercase tracking-[0.1em] text-ink-soft transition hover:text-terracotta-dark relative after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-terracotta after:transition-all hover:after:w-full';

function Header() {
  const { user, isAuthenticated, logout, updateUser } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setShowDropdown(false);
  };

  const changeAvatar = async (file) => {
    setUploading(true);
    try {
      const res = await authService.uploadAvatar(file);
      updateUser({ avatar: res.data.user?.avatar });
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(errMsg(err, 'Could not upload the photo'));
    } finally {
      setUploading(false);
    }
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

  const menuLink = 'block px-4 py-2 text-sm text-ink-soft transition hover:bg-parchment hover:text-ink';

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-cream/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full bg-terracotta text-lg text-white"
              aria-hidden="true"
            >
              🏺
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display text-xl font-bold tracking-tight text-ink">CraftVeda</span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.28em] text-ink-faint">
                Heritage crafts
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/products" className={navLink}>Products</Link>
            <Link to="/artisans" className={navLink}>Artisans</Link>
            <Link to="/workshops" className={navLink}>Workshops</Link>
            <Link to="/gi-search" className={navLink}>GI Tags</Link>
            <Link to="/about" className={navLink}>Heritage</Link>
            <Link to="/donate" className={navLink}>Donate</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/wishlist"
              aria-label="Wishlist"
              className="rounded-sm p-2 text-lg text-ink-soft transition hover:bg-parchment hover:text-terracotta-dark"
            >
              ♡
            </Link>
            <Link
              to="/cart"
              aria-label="Cart"
              className="relative rounded-sm p-2 text-lg text-ink-soft transition hover:bg-parchment hover:text-terracotta-dark"
            >
              🛒
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-terracotta px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  aria-expanded={showDropdown}
                  className="flex items-center gap-2 rounded-sm border border-ink/10 bg-white py-1.5 pl-1.5 pr-3 text-sm text-ink transition hover:border-terracotta/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-terracotta"
                >
                  <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-linen text-xs font-semibold text-ink-soft">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (user?.name || '?').charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="hidden font-medium sm:inline">{user?.name}</span>
                  <span className="text-[10px] text-ink-faint">▼</span>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-56 rounded-sm border border-ink/10 bg-white py-2 shadow-lg">
                    <div className="flex items-center gap-3 px-4 pb-3">
                      <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-linen text-sm font-semibold text-ink-soft">
                        {user?.avatar ? (
                          <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          (user?.name || '?').charAt(0).toUpperCase()
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
                        <p className="truncate text-xs text-ink-faint">{user?.email}</p>
                      </div>
                    </div>

                    <div className="border-t border-ink/10 px-2 pb-2 pt-2">
                      <UploadButton
                        label={uploading ? 'Uploading…' : 'Change photo'}
                        busy={uploading}
                        onFile={changeAvatar}
                        className="w-full bg-parchment text-ink hover:bg-linen"
                      />
                    </div>

                    <div className="border-t border-ink/10 pt-2">
                      <Link to={getDashboardLink()} className={menuLink} onClick={() => setShowDropdown(false)}>
                        Dashboard
                      </Link>

                      {user?.role === 'ARTISAN' && (
                        <>
                          <Link to="/artisan/products" className={menuLink} onClick={() => setShowDropdown(false)}>
                            My Products
                          </Link>
                          <Link to="/artisan/orders" className={menuLink} onClick={() => setShowDropdown(false)}>
                            My Orders
                          </Link>
                        </>
                      )}

                      {user?.role === 'CUSTOMER' && (
                        <Link to="/become-artisan" className={menuLink} onClick={() => setShowDropdown(false)}>
                          Become an Artisan
                        </Link>
                      )}

                      <Link to="/orders" className={menuLink} onClick={() => setShowDropdown(false)}>
                        {user?.role === 'ARTISAN' ? 'My Purchases' : 'My Orders'}
                      </Link>
                      <Link to="/my-bookings" className={menuLink} onClick={() => setShowDropdown(false)}>
                        My Bookings
                      </Link>

                      <button
                        onClick={handleLogout}
                        className="mt-1 block w-full border-t border-ink/10 px-4 py-2 pt-3 text-left text-sm text-clay-red transition hover:bg-clay-red-soft"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/auth"
                className="rounded-sm bg-terracotta px-4 py-2 text-sm font-semibold text-white transition hover:bg-terracotta-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
              >
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
