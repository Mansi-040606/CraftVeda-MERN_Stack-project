import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { productService } from '../../services/productService';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { errMsg } from '../../components/Toast';
import { inr } from '../../utils/format';
import { categoryLabel } from '../../constants/categories';
import StarRating from '../../components/review/StarRating';
import ReviewsSection from '../../components/review/ReviewsSection';
import ProductGallery from '../../components/product/ProductGallery';
import MakerSection from '../../components/product/MakerSection';
import CraftHeritage from '../../components/product/CraftHeritage';

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
      <div className="min-h-screen bg-cream py-8">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 rounded-sm border border-ink/10 bg-white p-5 md:grid-cols-2 md:p-8">
            <div className="shimmer aspect-square w-full rounded-sm" />
            <div className="space-y-4">
              <div className="shimmer h-3 w-24 rounded-sm" />
              <div className="shimmer h-9 w-3/4 rounded-sm" />
              <div className="shimmer h-5 w-40 rounded-sm" />
              <div className="shimmer h-8 w-32 rounded-sm" />
              <div className="shimmer h-28 w-full rounded-sm" />
              <div className="shimmer h-12 w-2/3 rounded-sm" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-cream py-8">
        <div className="mx-auto max-w-3xl rounded-sm border border-ink/10 bg-white px-6 py-16 text-center">
          <span className="text-5xl" role="img" aria-hidden="true">⚠️</span>
          <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
            {error?.includes('not found') ? 'Product not found' : 'Something went wrong'}
          </h2>
          <p className="mt-2 text-ink-soft">{error || 'This product does not exist.'}</p>
          <Link
            to="/products"
            className="mt-6 inline-block rounded-sm bg-terracotta px-6 py-3 font-semibold text-white transition hover:bg-terracotta-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
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
    <div className="min-h-screen bg-cream py-8">
      <div className="mx-auto max-w-7xl px-4">
        {/* ----- hero: gallery + buy box ----- */}
        <div className="overflow-hidden rounded-sm border border-ink/10 bg-white">
          <div className="flex flex-col md:flex-row">
            <div className="bg-parchment p-4 md:w-1/2 md:p-6">
              <ProductGallery images={images} alt={product.name} priority />
            </div>

            {/* ----- buy box ----- */}
            <div className="p-5 md:w-1/2 md:p-8">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-saffron-dark">
                {categoryLabel(product.category)}
              </span>
              <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-ink">
                {product.name}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StarRating value={product.averageRating || 0} size="text-base" />
                <span className="text-sm text-ink-soft">
                  {product.averageRating > 0
                    ? `${product.averageRating.toFixed(1)} (${product.reviewCount || 0} review${product.reviewCount === 1 ? '' : 's'})`
                    : 'No reviews yet'}
                </span>
              </div>

              <p className="mt-2 text-sm text-ink-soft">
                by{' '}
                {product.artisan ? (
                  <span className="font-medium text-terracotta-dark">
                    {product.artisan.businessName}
                  </span>
                ) : (
                  <span className="font-medium text-terracotta-dark">CraftVeda Artisan</span>
                )}
              </p>

              <p className="mt-6 font-display text-4xl font-semibold text-ink">
                {inr(product.price)}
              </p>

              <p className="mt-2 text-sm font-medium">
                {outOfStock ? (
                  <span className="text-clay-red">Out of stock</span>
                ) : (
                  <span className="text-moss">In stock: {stock}</span>
                )}
              </p>

              <p className="mt-4 leading-relaxed text-ink-soft">{product.description}</p>

              <dl className="mt-5 space-y-2 rounded-sm border border-ink/10 bg-parchment p-4 text-sm">
                {product.craftType && (
                  <div className="flex gap-3">
                    <dt className="w-28 shrink-0 text-ink-faint">Craft type</dt>
                    <dd className="text-ink-soft">{product.craftType}</dd>
                  </div>
                )}
                {product.material && (
                  <div className="flex gap-3">
                    <dt className="w-28 shrink-0 text-ink-faint">Material</dt>
                    <dd className="text-ink-soft">{product.material}</dd>
                  </div>
                )}
                {product.color?.length > 0 && (
                  <div className="flex gap-3">
                    <dt className="w-28 shrink-0 text-ink-faint">Colour</dt>
                    <dd className="text-ink-soft">{product.color.join(', ')}</dd>
                  </div>
                )}
                <div className="flex gap-3">
                  <dt className="w-28 shrink-0 text-ink-faint">Category</dt>
                  <dd className="text-ink-soft">{categoryLabel(product.category)}</dd>
                </div>
              </dl>

              {/* ----- quantity + actions ----- */}
              <div className="mt-6 flex items-center gap-4">
                <div className="flex items-center overflow-hidden rounded-sm border border-ink/20">
                  <button
                    onClick={() => changeQuantity(-1)}
                    disabled={outOfStock || quantity <= 1}
                    aria-label="Decrease quantity"
                    className="h-11 w-11 text-ink transition hover:bg-parchment disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-10 text-center font-medium text-ink">{quantity}</span>
                  <button
                    onClick={() => changeQuantity(1)}
                    disabled={outOfStock || quantity >= stock}
                    aria-label="Increase quantity"
                    className="h-11 w-11 text-ink transition hover:bg-parchment disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm text-ink-faint">Max {stock}</span>
              </div>

              <div className="mt-6 flex gap-3">
                {isOwner ? (
                  // The artisan who owns this product cannot buy it.
                  <button
                    disabled
                    className="flex-1 cursor-not-allowed rounded-sm bg-linen px-6 py-3.5 font-semibold text-ink-soft"
                  >
                    This is your product
                  </button>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    disabled={outOfStock || adding}
                    className="flex-1 rounded-sm bg-terracotta px-6 py-3.5 font-semibold text-white transition hover:bg-terracotta-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta disabled:cursor-not-allowed disabled:bg-linen disabled:text-ink-faint"
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
                    aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                    aria-pressed={wishlisted}
                    className={`rounded-sm border-2 px-6 py-3.5 transition ${
                      wishlisted
                        ? 'border-clay-red bg-clay-red-soft text-clay-red'
                        : 'border-ink/25 text-ink hover:border-terracotta hover:text-terracotta-dark'
                    }`}
                  >
                    {wishlisted ? '♥ Saved' : '♡ Save'}
                  </button>
                )}
              </div>

              {product.isActive === false && (
                <div className="mt-4 rounded-sm border border-clay-red/25 bg-clay-red-soft p-4 text-sm text-clay-red">
                  This product is currently unavailable.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ----- craft heritage ----- */}
        <CraftHeritage
          giTag={product.giTag}
          craftType={product.craftType}
          material={product.material}
        />

        {/* ----- artisan story ----- */}
        <MakerSection artisan={product.artisan} />

        {/* ----- reviews ----- */}
        <ReviewsSection productId={product._id} />
      </div>
    </div>
  );
}

export default ProductDetail;
