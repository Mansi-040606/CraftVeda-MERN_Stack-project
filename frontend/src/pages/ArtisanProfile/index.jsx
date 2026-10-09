import { Link } from 'react-router-dom';

function ArtisanProfile() {
  return (
    <div className="min-h-screen bg-amber-50">
      <div className="bg-amber-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="text-8xl">👩‍🎨</div>
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold">Lakshmi Devi</h1>
              <p className="text-amber-200 mt-2">Varanasi, Uttar Pradesh</p>
              <p className="text-amber-300 mt-1">★ 4.9 (48 reviews)</p>
              <div className="flex gap-2 mt-4 justify-center md:justify-start">
                <span className="bg-amber-800 px-3 py-1 rounded-full text-sm">Banarasi Silk</span>
                <span className="bg-amber-800 px-3 py-1 rounded-full text-sm">40+ Years Experience</span>
                <span className="bg-green-600 px-3 py-1 rounded-full text-sm">✓ Verified</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md p-8 mb-8">
              <h2 className="text-xl font-bold text-amber-900 mb-4">Artisan Story</h2>
              <p className="text-amber-800 leading-relaxed">
                Born into a family of weavers, Lakshmi Devi started her journey in the art of Banarasi silk weaving 
                at the age of 12. Today, with over 40 years of experience, she is recognized as one of the 
                master weavers preserving this ancient craft.
              </p>
              <p className="text-amber-800 leading-relaxed mt-4">
                Her creations have been exhibited at national handicraft fairs and have found homes with 
                discerning buyers across the world. She currently trains 15 young artisans in traditional techniques.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-xl font-bold text-amber-900 mb-6">Products by Lakshmi Devi</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { name: 'Handwoven Banarasi Silk Saree', price: 12999, emoji: '👗' },
                  { name: 'Banarasi Dupatta', price: 4999, emoji: '🧣' },
                  { name: 'Silk Brocade Fabric', price: 8999, emoji: '🪡' },
                  { name: 'Zari Work Shawl', price: 6999, emoji: '🧶' },
                ].map((product, idx) => (
                  <Link key={idx} to="/product/1" className="border border-amber-200 rounded-lg p-4 hover:shadow-md transition">
                    <div className="bg-amber-100 rounded-lg h-32 flex items-center justify-center text-5xl">
                      {product.emoji}
                    </div>
                    <h3 className="font-medium text-amber-900 mt-3">{product.name}</h3>
                    <p className="text-amber-700 font-semibold mt-1">₹{product.price.toLocaleString()}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-xl shadow-md p-6 mb-8">
              <h3 className="font-bold text-amber-900 mb-4">Workshop Information</h3>
              <div className="space-y-3 text-sm text-amber-800">
                <p><strong>Location:</strong> Varanasi, UP</p>
                <p><strong>Experience:</strong> 40+ Years</p>
                <p><strong>Products:</strong> 32</p>
                <p><strong>GI Tag:</strong> Varanasi Silk</p>
              </div>
              <button className="w-full bg-amber-700 text-white py-3 rounded-lg mt-4 hover:bg-amber-800 transition">
                Book Workshop
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-bold text-amber-900 mb-4">Awards & Recognition</h3>
              <ul className="space-y-3 text-sm text-amber-800">
                <li className="flex items-start gap-2">
                  <span>🏆</span>
                  <span>National Handicraft Award, 2018</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>🏆</span>
                  <span>Master Artisan Title, GI Tagged</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArtisanProfile;
