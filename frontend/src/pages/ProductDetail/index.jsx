import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { productService } from '../../services/productService';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { errMsg } from '../../components/Toast';
import { inr } from '../../utils/format';
import { categoryLabel } from '../../constants/categories';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { addToCart, toggleWishlist, isInWishlist } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  // Load the product whenever the id changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setQuantity(1);

    productService
      .getById(id)
      .then((res) => {
        if (!cancelled) setProduct(res.data.product);
      })
      .catch((err) => {
        if (!cancelled) setError(errMsg(err, 'Failed to load product'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id]);

  // ----- states: loading / error -----
  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 py-8">
        <div className="max-w-7xl mx-auto px-4 bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/2 bg-amber-100 h-96" />
            <div className="md:w-1/2 p-8 space-y-4">
              <div className="h-4 bg-amber-100 rounded w-1/4" />
              <div className="h-8 bg-amber-100 rounded w-3/4" />
              <div className="h-6 bg-amber-100 rounded w-1/3" />
              <div className="h-10 bg-amber-100 rounded w-1/2" />
              <div className="h-24 bg-amber-100 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-amber-50 py-8">
        <div className="max-w-3xl mx-auto px-4 bg-white rounded-xl shadow-md p-12 text-center">
          <span className="text-5xl">⚠️</span>
          <h2 className="text-xl font-semibold text-amber-900 mt-4">
            {error?.includes('not found') ? 'Product not found' : 'Something went wrong'}
          </h2>
          <p className="text-amber-600 mt-2">{error || 'This product does not exist.'}</p>
          <Link
            to="/products"
            className="inline-block mt-4 bg-amber-700 text-white px-6 py-2 rounded-lg hover:bg-amber-800 transition"
          >
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  // ----- product facts -----
  const stock = product.stock ?? 0;
  const outOfStock = stock < 1 || product.isActive === false;
  const myId = user?._id || user?.id;
  const isOwner = Boolean(
    isAuthenticated && myId && product.artisan && String(product.artisan.user) === String(myId)
  );
  const wishlisted = isInWishlist(product._id);
  const images = product.images || [];

  // Send logged-in users to /auth and bring them back here afterwards.
  const requireLogin = () => navigate('/auth', { state: { from: location } });

  const handleAddToCart = async () => {
    if (!isAuthenticated) return requireLogin();
    if (isOwner || outOfStock || adding) return;
    setAdding(true);
    await addToCart(product._id, quantity);
    setAdding(false);
  };

  const handleWishlist = () => {
    if (!isAuthenticated) return requireLogin();
    if (isOwner) return;
    toggleWishlist(product._id);
  };

  const changeQuantity = (delta) => {
    setQuantity((q) => Math.min(stock, Math.max(1, q + delta)));
  };

  return (
    <div className="min-h-screen bg-amber-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* ----- images ----- */}
            <div className="md:w-1/2 bg-amber-100 flex items-center justify-center h-96">
              {images.length > 0 ? (
                <img src={images[0]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-9xl">🏺</span>
              )}
            </div>

            {/* ----- buy box ----- */}
            <div className="md:w-1/2 p-8">
              <span className="text-sm text-amber-600 font-medium uppercase">
                {categoryLabel(product.category)}
              </span>
              <h1 className="text-2xl font-bold text-amber-900 mt-2">{product.name}</h1>
              <p className="text-amber-600 mt-2">
                by{' '}
                {product.artisan ? (
                  <span className="text-amber-700">{product.artisan.businessName}</span>
                ) : (
                  <span className="text-amber-700">CraftVeda Artisan</span>
                )}
              </p>

              <p className="text-3xl font-bold text-amber-900 mt-6">{inr(product.price)}</p>

              <p className="text-sm text-amber-700 mt-1">
                {outOfStock ? (
                  <span className="text-red-600 font-medium">Out of stock</span>
                ) : (
                  <span className="text-green-700 font-medium">In stock: {stock}</span>
                )}
              </p>

              <p className="text-amber-700 mt-4 leading-relaxed">{product.description}</p>

              <div className="mt-6 space-y-2 text-sm text-amber-800">
                {product.craftType && <p><strong>Craft Type:</strong> {product.craftType}</p>}
                {product.material && <p><strong>Material:</strong> {product.material}</p>}
                {product.color?.length > 0 && <p><strong>Color:</strong> {product.color.join(', ')}</p>}
                <p><strong>Category:</strong> {categoryLabel(product.category)}</p>
              </div>

              {/* ----- quantity + actions ----- */}
              <div className="flex items-center gap-4 mt-6">
                <div className="flex items-center border border-amber-300 rounded-lg">
                  <button
                    onClick={() => changeQuantity(-1)}
                    disabled={outOfStock || quantity <= 1}
                    className="w-10 h-10 text-amber-800 hover:bg-amber-50 transition disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-amber-900 font-medium">{quantity}</span>
                  <button
                    onClick={() => changeQuantity(1)}
                    disabled={outOfStock || quantity >= stock}
                    className="w-10 h-10 text-amber-800 hover:bg-amber-50 transition disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm text-amber-600">Max {stock}</span>
              </div>

              <div className="flex gap-4 mt-6">
                {isOwner ? (
                  // The artisan who owns this product cannot buy it.
                  <button
                    disabled
                    className="flex-1 bg-amber-200 text-amber-700 py-3 rounded-lg font-semibold cursor-not-allowed"
                  >
                    This is your product
                  </button>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    disabled={outOfStock || adding}
                    className="flex-1 bg-amber-700 text-white py-3 rounded-lg hover:bg-amber-800 transition font-semibold disabled:bg-amber-300 disabled:cursor-not-allowed"
                  >
                    {outOfStock
                      ? 'Out of Stock'
                      : adding
                        ? 'Adding...'
                        : isAuthenticated
                          ? 'Add to Cart'
                          : 'Sign in to Add to Cart'}
                  </button>
                )}

                {!isOwner && (
                  <button
                    onClick={handleWishlist}
                    aria-label="Toggle wishlist"
                    className={`px-6 py-3 border-2 rounded-lg transition ${
                      wishlisted
                        ? 'border-red-400 text-red-500 bg-red-50'
                        : 'border-amber-700 text-amber-700 hover:bg-amber-50'
                    }`}
                  >
                    {wishlisted ? '♥' : '♡'}
                  </button>
                )}
              </div>

              {product.isActive === false && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg text-sm text-red-700">
                  This product is currently unavailable.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ----- artisan story ----- */}
        {product.artisan && (
          <div className="mt-8 bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-amber-900 mb-4">Artisan Story</h2>
            <div className="flex items-start gap-4">
              <div className="text-4xl">👩‍🎨</div>
              <div>
                <h3 className="font-semibold text-amber-800">{product.artisan.businessName}</h3>
                <p className="text-sm text-amber-600">
                  {[product.artisan.location?.city, product.artisan.location?.state]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                {product.artisan.story && (
                  <p className="text-amber-700 mt-2 text-sm leading-relaxed">
                    {product.artisan.story}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductDetail;
