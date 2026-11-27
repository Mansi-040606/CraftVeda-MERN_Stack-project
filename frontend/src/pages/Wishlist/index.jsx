import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { inr } from '../../utils/format';
import ProductImage from '../../components/product/ProductImage';

function Wishlist() {
  const { wishlist, toggleWishlist, moveToCart, loading, loadError, reload } = useCart();
  const { isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-cream py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-ink mb-8">My Wishlist</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-sm border border-ink/10 p-4 flex gap-4 animate-pulse">
                <div className="bg-parchment rounded-sm w-24 h-24" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-parchment rounded w-3/4" />
                  <div className="h-3 bg-parchment rounded w-1/2" />
                  <div className="h-5 bg-parchment rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Not signed in → prompt instead of showing an empty wishlist.
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-cream py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-ink mb-8">My Wishlist</h1>
          <div className="bg-white rounded-sm border border-ink/10 p-12 text-center">
            <span className="text-6xl">♡</span>
            <h2 className="text-xl font-semibold text-ink mt-4">Sign in to see your wishlist</h2>
            <p className="text-ink-soft mt-2">Your saved products live in your account.</p>
            <Link to="/auth" className="inline-block mt-4 bg-terracotta text-white px-6 py-2 rounded-sm hover:bg-terracotta-dark transition">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-ink mb-8">My Wishlist</h1>

        {loadError ? (
          <div className="bg-white rounded-sm border border-ink/10 p-12 text-center">
            <span className="text-6xl">⚠️</span>
            <h2 className="text-xl font-semibold text-ink mt-4">Could not load your wishlist</h2>
            <p className="text-ink-soft mt-2">{loadError}</p>
            <button
              onClick={reload}
              className="mt-4 bg-terracotta text-white px-6 py-2 rounded-sm hover:bg-terracotta-dark transition"
            >
              Retry
            </button>
          </div>
        ) : wishlist.length === 0 ? (
          <div className="bg-white rounded-sm border border-ink/10 p-12 text-center">
            <span className="text-6xl">♡</span>
            <h2 className="text-xl font-semibold text-ink mt-4">Your wishlist is empty</h2>
            <p className="text-ink-soft mt-2">Start adding products you love!</p>
            <Link to="/products" className="inline-block mt-4 bg-terracotta text-white px-6 py-2 rounded-sm hover:bg-terracotta-dark transition">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {wishlist.map((product) => (
              <div key={product._id} className="bg-white rounded-sm border border-ink/10 p-4 flex gap-4">
                <Link to={`/product/${product._id}`} className="bg-parchment rounded-sm w-24 h-24 flex items-center justify-center text-4xl overflow-hidden flex-shrink-0">
                  <ProductImage
                    src={product.images?.[0]}
                    alt={product.name}
                    frame="h-full w-full"
                    preset="thumb_140"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${product._id}`}>
                    <h3 className="font-semibold text-ink truncate hover:text-terracotta-dark">{product.name}</h3>
                  </Link>
                  <p className="text-sm text-ink-soft truncate">
                    by {product.artisan?.businessName || 'CraftVeda Artisan'}
                  </p>
                  <p className="text-lg font-bold text-ink-soft mt-2">{inr(product.price)}</p>
                  <div className="flex gap-4 mt-2">
                    <button
                      onClick={() => moveToCart(product._id)}
                      className="text-terracotta-dark text-sm hover:underline"
                    >
                      Move to Cart
                    </button>
                    <button
                      onClick={() => toggleWishlist(product._id)}
                      className="text-red-500 text-sm hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Wishlist;
