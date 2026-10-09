import { Link } from 'react-router-dom';

function Artisans() {
  const artisans = [
    { id: 1, name: 'Ramesh Kumar', location: 'Jaipur, Rajasthan', craft: 'Block Printing', products: 45, rating: 4.8, emoji: '👨‍🎨' },
    { id: 2, name: 'Lakshmi Devi', location: 'Varanasi, Uttar Pradesh', craft: 'Banarasi Silk', products: 32, rating: 4.9, emoji: '👩‍🎨' },
    { id: 3, name: 'Mohan Sharma', location: 'Khurai, Madhya Pradesh', craft: 'Bidri Craft', products: 28, rating: 4.7, emoji: '👨‍🔧' },
    { id: 4, name: 'Sunita Devi', location: 'Jodhpur, Rajasthan', craft: 'Meenakari Jewelry', products: 56, rating: 4.6, emoji: '👩‍💼' },
    { id: 5, name: 'Gopal Das', location: 'Kashmir', craft: 'Pashmina Shawls', products: 23, rating: 4.8, emoji: '👨‍🎭' },
    { id: 6, name: 'Kamla Bai', location: 'Kutch, Gujarat', craft: 'Rogan Art', products: 18, rating: 4.9, emoji: '👩‍🎨' },
  ];

  return (
    <div className="min-h-screen bg-amber-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-amber-900 mb-4">Our Artisans</h1>
          <p className="text-amber-700 max-w-2xl mx-auto">
            Meet the master craftspeople who preserve India&apos;s rich artistic heritage. 
            Each artisan brings generations of expertise and passion to their craft.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 mb-8">
          <div className="md:w-64 bg-white rounded-xl shadow-md p-6">
            <h3 className="font-semibold text-amber-900 mb-4">Filter Artisans</h3>
            <div className="mb-4">
              <label className="text-sm text-amber-800 font-medium">State</label>
              <select className="w-full mt-1 border border-amber-300 rounded-lg px-3 py-2 text-amber-800">
                <option>All States</option>
                <option>Rajasthan</option>
                <option>Uttar Pradesh</option>
                <option>Gujarat</option>
                <option>Kashmir</option>
                <option>Karnataka</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="text-sm text-amber-800 font-medium">Craft Type</label>
              <select className="w-full mt-1 border border-amber-300 rounded-lg px-3 py-2 text-amber-800">
                <option>All Crafts</option>
                <option>Textiles</option>
                <option>Pottery</option>
                <option>Jewelry</option>
                <option>Woodwork</option>
                <option>Metalwork</option>
              </select>
            </div>
            <button className="w-full bg-amber-700 text-white py-2 rounded-lg hover:bg-amber-800 transition">
              Apply Filters
            </button>
          </div>

          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {artisans.map(artisan => (
                <Link 
                  key={artisan.id} 
                  to={`/artisan/${artisan.id}`}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition group"
                >
                  <div className="bg-amber-100 h-40 flex items-center justify-center">
                    <span className="text-7xl">{artisan.emoji}</span>
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-amber-900 group-hover:text-amber-700 transition">
                          {artisan.name}
                        </h3>
                        <p className="text-sm text-amber-600 mt-1">{artisan.location}</p>
                      </div>
                      <span className="text-amber-500 text-sm">★ {artisan.rating}</span>
                    </div>
                    <p className="text-amber-800 mt-3 font-medium">{artisan.craft}</p>
                    <p className="text-sm text-amber-600 mt-2">{artisan.products} products</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Artisans;
