import { Link } from 'react-router-dom';

function GISearch() {
  const giTags = [
    { name: 'Varanasi Silk', state: 'Uttar Pradesh', type: 'Textiles', products: 'Sarees, Dupattas' },
    { name: 'Kashmir Pashmina', state: 'Jammu & Kashmir', type: 'Textiles', products: 'Shawls, Stoles' },
    { name: 'Blue Pottery', state: 'Rajasthan', type: 'Pottery', products: 'Vases, Tiles' },
    { name: 'Kalamkari', state: 'Andhra Pradesh', type: 'Textiles', products: 'Fabrics, Wall hangings' },
    { name: 'Chikankari', state: 'Uttar Pradesh', type: 'Embroidery', products: 'Kurtas, Sarees' },
    { name: 'Bidriware', state: 'Karnataka', type: 'Metalwork', products: 'Bowl, Vases, Jewelry' },
    { name: 'Rajasthani Miniature', state: 'Rajasthan', type: 'Painting', products: 'Paintings' },
    { name: 'Meenakari', state: 'Rajasthan', type: 'Metalwork', products: 'Jewelry, Utensils' },
  ];

  return (
    <div className="min-h-screen bg-amber-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-amber-900 mb-4">GI Tag Products</h1>
          <p className="text-amber-700 max-w-2xl mx-auto">
            Geographical Indication (GI) tags certify the authenticity and origin of traditional 
            Indian crafts. Explore products protected under GI tags.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {giTags.map(gi => (
            <div key={gi.name} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
              <div className="bg-amber-100 rounded-lg h-24 flex items-center justify-center text-4xl mb-4">
                {gi.type === 'Textiles' ? '🧵' : gi.type === 'Pottery' ? '🏺' : gi.type === 'Metalwork' ? '⚱️' : '🎨'}
              </div>
              <h3 className="font-bold text-amber-900">{gi.name}</h3>
              <p className="text-sm text-amber-600 mt-1">📍 {gi.state}</p>
              <p className="text-sm text-amber-800 mt-2"><strong>Type:</strong> {gi.type}</p>
              <p className="text-sm text-amber-800"><strong>Products:</strong> {gi.products}</p>
              <Link 
                to={`/products?giTag=${gi.name}`}
                className="inline-block mt-4 text-amber-700 hover:text-amber-900 font-medium text-sm"
              >
                View Products →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GISearch;
