import { Link } from 'react-router-dom';

function Checkout() {
  return (
    <div className="min-h-screen bg-amber-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-amber-900 mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="font-bold text-amber-900 mb-4">Shipping Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-amber-800 font-medium">Full Name</label>
                  <input type="text" className="w-full border border-amber-300 rounded-lg px-4 py-2 mt-1" placeholder="Enter full name" />
                </div>
                <div>
                  <label className="text-sm text-amber-800 font-medium">Phone</label>
                  <input type="tel" className="w-full border border-amber-300 rounded-lg px-4 py-2 mt-1" placeholder="+91 xxxxxxxxxx" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-amber-800 font-medium">Street Address</label>
                  <input type="text" className="w-full border border-amber-300 rounded-lg px-4 py-2 mt-1" placeholder="House No., Street, Area" />
                </div>
                <div>
                  <label className="text-sm text-amber-800 font-medium">City</label>
                  <input type="text" className="w-full border border-amber-300 rounded-lg px-4 py-2 mt-1" placeholder="City" />
                </div>
                <div>
                  <label className="text-sm text-amber-800 font-medium">State</label>
                  <input type="text" className="w-full border border-amber-300 rounded-lg px-4 py-2 mt-1" placeholder="State" />
                </div>
                <div>
                  <label className="text-sm text-amber-800 font-medium">PIN Code</label>
                  <input type="text" className="w-full border border-amber-300 rounded-lg px-4 py-2 mt-1" placeholder="6-digit PIN" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="font-bold text-amber-900 mb-4">Payment Method</h2>
              <div className="space-y-3">
                {['Credit/Debit Card', 'UPI', 'Net Banking', 'Cash on Delivery'].map(method => (
                  <label key={method} className="flex items-center gap-3 p-3 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-50 transition">
                    <input type="radio" name="payment" className="text-amber-600" />
                    <span className="text-amber-800">{method}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
              <h2 className="font-bold text-amber-900 mb-4">Order Summary</h2>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-amber-700">Banarasi Silk Saree × 1</span>
                  <span className="text-amber-900">₹12,999</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">Blue Pottery Vase × 2</span>
                  <span className="text-amber-900">₹4,998</span>
                </div>
              </div>
              <div className="border-t border-amber-200 pt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-amber-700">Subtotal</span>
                  <span className="text-amber-900">₹17,997</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">Shipping</span>
                  <span className="text-amber-900">FREE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">Tax</span>
                  <span className="text-amber-900">₹3,239</span>
                </div>
                <div className="border-t border-amber-200 pt-2 flex justify-between font-bold">
                  <span className="text-amber-900">Total</span>
                  <span className="text-amber-900">₹21,236</span>
                </div>
              </div>
              <button className="w-full bg-amber-700 text-white py-3 rounded-lg mt-6 hover:bg-amber-800 transition font-semibold">
                Place Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Checkout;
