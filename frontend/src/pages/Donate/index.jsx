import { useState } from 'react';

function Donate() {
  const [amount, setAmount] = useState(500);

  const presets = [100, 250, 500, 1000, 2500];

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="bg-amber-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Preserve Heritage</h1>
          <p className="text-amber-200 text-lg">
            Your donation helps traditional artisans sustain their craft and pass it to future generations
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-xl font-bold text-amber-900 mb-6">Make a Donation</h2>

          <div className="mb-6">
            <label className="text-sm text-amber-800 font-medium mb-2 block">Select Amount</label>
            <div className="flex flex-wrap gap-3">
              {presets.map(preset => (
                <button
                  key={preset}
                  onClick={() => setAmount(preset)}
                  className={`px-4 py-2 rounded-lg border-2 transition ${
                    amount === preset 
                      ? 'border-amber-600 bg-amber-100 text-amber-900' 
                      : 'border-amber-200 text-amber-700 hover:border-amber-400'
                  }`}
                >
                  ₹{preset}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="text-sm text-amber-800 font-medium mb-2 block">Custom Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full border border-amber-300 rounded-lg px-4 py-3 text-lg"
              placeholder="Enter amount"
            />
          </div>

          <div className="mb-6">
            <label className="text-sm text-amber-800 font-medium mb-2 block">Craft Type (Optional)</label>
            <select className="w-full border border-amber-300 rounded-lg px-4 py-3">
              <option>Support All Crafts</option>
              <option>Textiles & Weaving</option>
              <option>Pottery & Ceramics</option>
              <option>Metalwork</option>
              <option>Woodwork & Carving</option>
              <option>Painting & Art</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="text-sm text-amber-800 font-medium mb-2 block">Message (Optional)</label>
            <textarea
              className="w-full border border-amber-300 rounded-lg px-4 py-3"
              rows="3"
              placeholder="Leave a message of support..."
            />
          </div>

          <button className="w-full bg-amber-700 text-white py-4 rounded-lg hover:bg-amber-800 transition font-semibold text-lg">
            Donate ₹{amount}
          </button>

          <p className="text-center text-sm text-amber-600 mt-4">
            🔒 Secure payment • 80% of donations go directly to artisans
          </p>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-2xl font-bold text-amber-900">₹12L+</p>
            <p className="text-sm text-amber-600">Raised</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-2xl font-bold text-amber-900">500+</p>
            <p className="text-sm text-amber-600">Artisans Supported</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-2xl font-bold text-amber-900">15</p>
            <p className="text-sm text-amber-600">Crafts Preserved</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Donate;
