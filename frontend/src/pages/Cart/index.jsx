import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { inr } from '../../utils/format';

function Cart() {
  const { cart, loading, loadError, reload, updateQuantity, removeFromCart, clearCart } = useCart();
  const navigate = useNavigate();

  const items = cart.items || [];
  const availableCount = cart.availableCount || 0;
  const unavailableCount = cart.unavailableCount || 0;

  const changeQuantity = async (item, delta) => {
    const product = item.product;
    if (!product) return;
    const stock = product.stock ?? 0;
    const next = Math.max(1, Math.min(item.quantity + delta, stock));
    if (next === item.quantity) return;
    const ok = await updateQuantity(product._id, next);
    // Stock changed under us (or product went away) → refresh from the server.
    if (!ok) reload();
  };

  const remove = async (item) => {
    if (!item.product) return;
    const ok = await removeFromCart(item.product._id);
    if (!ok) reload();
  };

  const handleClear = async () => {
    if (!window.confirm('Remove all items from your cart?')) return;
    const ok = await clearCart();
    if (!ok) reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-amber-900 mb-8">Shopping Cart</h1>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-md p-6 flex gap-4 animate-pulse">
                  <div className="bg-amber-100 rounded-lg w-24 h-24" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-amber-100 rounded w-2/3" />
                    <div className="h-3 bg-amber-100 rounded w-1/3" />
                    <div className="h-6 bg-amber-100 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 h-64 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-amber-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-amber-900 mb-8">Shopping Cart</h1>
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <span className="text-6xl">⚠️</span>
            <h2 className="text-xl font-semibold text-amber-900 mt-4">Could not load your cart</h2>
            <p className="text-amber-600 mt-2">{loadError}</p>
            <button
              onClick={reload}
              className="mt-4 bg-amber-700 text-white px-6 py-2 rounded-lg hover:bg-amber-800 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-amber-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-amber-900 mb-8">Shopping Cart</h1>
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <span className="text-6xl">🛒</span>
            <h2 className="text-xl font-semibold text-amber-900 mt-4">Your cart is empty</h2>
            <p className="text-amber-600 mt-2">Find something handmade you love and it will show up here.</p>
            <Link
              to="/products"
              className="inline-block mt-4 bg-amber-700 text-white px-6 py-2 rounded-lg hover:bg-amber-800 transition"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-amber-900">Shopping Cart</h1>
          <button
            onClick={handleClear}
            className="text-red-500 text-sm hover:underline"
          >
            Clear Cart
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {items.map((item, index) => {
              const product = item.product;
              const productId = product?._id || `missing-${index}`;
              const stock = product?.stock ?? 0;
              // Only lines the API will accept a quantity change for.
              const canEditQty = Boolean(product) && product.isActive !== false && stock >= 1;

              return (
                <div
                  key={productId}
                  className={`bg-white rounded-xl shadow-md p-6 mb-4 flex gap-4 ${
                    item.available ? '' : 'opacity-80'
                  }`}
                >
                  <Link
                    to={product ? `/product/${product._id}` : '/products'}
                    className="bg-amber-100 rounded-lg w-24 h-24 flex items-center justify-center text-4xl overflow-hidden flex-shrink-0"
                  >
                    {product?.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>🏺</span>
                    )}
                  </Link>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-amber-900 truncate">
                      {product ? (
                        <Link to={`/product/${product._id}`} className="hover:text-amber-700">
                          {product.name}
                        </Link>
                      ) : (
                        'Product removed'
                      )}
                    </h3>
                    <p className="text-sm text-amber-600 truncate">
                      by {product?.artisan?.businessName || 'CraftVeda Artisan'}
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      Unit price: <span className="font-semibold">{inr(item.unitPrice)}</span>
                    </p>
                    {!item.available && (
                      <p className="mt-2 inline-block px-2 py-1 rounded text-xs bg-red-50 text-red-700 font-medium">
                        {item.reason || 'Not available'} — excluded from totals
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end justify-between gap-2">
                    <p className="font-bold text-amber-800">
                      {item.available ? inr(item.lineTotal) : '—'}
                    </p>

                    {canEditQty ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => changeQuantity(item, -1)}
                          disabled={item.quantity <= 1}
                          aria-label="Decrease quantity"
                          className="w-8 h-8 bg-amber-100 rounded-lg hover:bg-amber-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-amber-900">{item.quantity}</span>
                        <button
                          onClick={() => changeQuantity(item, 1)}
                          disabled={item.quantity >= stock}
                          aria-label="Increase quantity"
                          className="w-8 h-8 bg-amber-100 rounded-lg hover:bg-amber-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-amber-500">
                        {product ? `Qty ${item.quantity}` : 'Quantity unavailable'}
                      </span>
                    )}

                    <button
                      onClick={() => remove(item)}
                      disabled={!product}
                      className="text-red-500 text-sm hover:underline disabled:text-red-300 disabled:no-underline disabled:cursor-not-allowed"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}

            {unavailableCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {unavailableCount} item{unavailableCount > 1 ? 's are' : ' is'} unavailable and not
                counted in the total. Update the quantity or remove {unavailableCount > 1 ? 'them' : 'it'}.
              </div>
            )}
          </div>

          <div>
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
              <h2 className="font-bold text-amber-900 mb-4">Order Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-amber-700">Subtotal ({availableCount} item{availableCount === 1 ? '' : 's'})</span>
                  <span className="text-amber-900 font-semibold">{inr(cart.subtotal)}</span>
                </div>
                <p className="text-xs text-amber-600">
                  Shipping and 18% GST are calculated by the server when you place the order.
                </p>
              </div>
              <button
                onClick={() => navigate('/checkout')}
                disabled={availableCount === 0}
                className="block w-full bg-amber-700 text-white text-center py-3 rounded-lg mt-6 hover:bg-amber-800 transition font-semibold disabled:bg-amber-300 disabled:cursor-not-allowed"
              >
                {availableCount === 0 ? 'No items available' : 'Proceed to Checkout'}
              </button>
              <Link
                to="/products"
                className="block w-full text-amber-700 text-center py-2 mt-3 hover:underline"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cart;
