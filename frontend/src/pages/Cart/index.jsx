import { Link } from 'react-router-dom';

function Cart() {
  const cartItems = [
    { id: 1, name: 'Handwoven Banarasi Silk Saree', price: 12999, quantity: 1, artisan: 'Lakshmi Devi', emoji: '👗' },
    { id: 2, name: 'Blue Pottery Vase', price: 2499, quantity: 2, artisan: 'Ravi Kumar', emoji: '🏺' },
  ];

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 500 ? 0 : 50;
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + shipping + tax;

  return (
    <div className="min-h-screen bg-amber-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-amber-900 mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {cartItems.map(item => (
              <div key={item.id} className="bg-white rounded-xl shadow-md p-6 mb-4 flex gap-4">
                <div className="bg-amber-100 rounded-lg w-24 h-24 flex items-center justify-center text-4xl">
                  {item.emoji}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900">{item.name}</h3>
                  <p className="text-sm text-amber-600">by {item.artisan}</p>
                  <p className="text-lg font-bold text-amber-800 mt-2">₹{item.price.toLocaleString()}</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <button className="w-8 h-8 bg-amber-100 rounded-lg hover:bg-amber-200 transition">-</button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button className="w-8 h-8 bg-amber-100 rounded-lg hover:bg-amber-200 transition">+</button>
                  </div>
                  <button className="text-red-500 text-sm hover:underline">Remove</button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
              <h2 className="font-bold text-amber-900 mb-4">Order Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-amber-700">Subtotal</span>
                  <span className="text-amber-900">₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">Shipping</span>
                  <span className="text-amber-900">{shipping === 0 ? 'FREE' : `₹${shipping}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">Tax (18% GST)</span>
                  <span className="text-amber-900">₹{tax.toLocaleString()}</span>
                </div>
                <div className="border-t border-amber-200 pt-3 flex justify-between font-bold">
                  <span className="text-amber-900">Total</span>
                  <span className="text-amber-900">₹{total.toLocaleString()}</span>
                </div>
              </div>
              <Link 
                to="/checkout"
                className="block w-full bg-amber-700 text-white text-center py-3 rounded-lg mt-6 hover:bg-amber-800 transition font-semibold"
              >
                Proceed to Checkout
              </Link>
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
