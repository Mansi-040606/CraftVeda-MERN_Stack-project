import { Link } from 'react-router-dom';

function Home() {
  return (
    <div>
      <section className="relative bg-gradient-to-b from-amber-50 to-amber-100 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold text-amber-900 mb-4">
                Preserving Heritage,<br />One Craft at a Time
              </h1>
              <p className="text-lg text-amber-700 mb-8 max-w-xl">
                Discover authentic handmade products from India&apos;s finest traditional artisans. 
                Every purchase supports local communities and preserves centuries-old craftsmanship.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Link 
                  to="/products" 
                  className="bg-amber-700 text-white px-8 py-3 rounded-lg hover:bg-amber-800 transition font-semibold"
                >
                  Explore Products
                </Link>
                <Link 
                  to="/artisans" 
                  className="border-2 border-amber-700 text-amber-700 px-8 py-3 rounded-lg hover:bg-amber-50 transition font-semibold"
                >
                  Meet Artisans
                </Link>
              </div>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-amber-200 rounded-2xl w-32 h-32 md:w-40 md:h-40 flex items-center justify-center text-6xl">🏺</div>
                <div className="bg-orange-200 rounded-2xl w-32 h-32 md:w-40 md:h-40 mt-8 flex items-center justify-center text-6xl">🧵</div>
                <div className="bg-yellow-200 rounded-2xl w-32 h-32 md:w-40 md:h-40 -mt-4 flex items-center justify-center text-6xl">🎨</div>
                <div className="bg-amber-300 rounded-2xl w-32 h-32 md:w-40 md:h-40 mt-4 flex items-center justify-center text-6xl">💎</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-amber-900 mb-2">Shop by Category</h2>
            <p className="text-amber-700">Explore our curated collection of traditional crafts</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'Textiles', emoji: '🧵', desc: 'Handwoven fabrics & garments' },
              { name: 'Pottery', emoji: '🏺', desc: 'Terracotta & ceramic artistry' },
              { name: 'Jewelry', emoji: '💎', desc: 'Traditional metal & beadwork' },
              { name: 'Woodwork', emoji: '🪵', desc: 'Carved furniture & decor' },
              { name: 'Metalwork', emoji: '⚱️', desc: 'Brass & bronze craftsmanship' },
              { name: 'Painting', emoji: '🎨', desc: 'Miniature & folk art' },
              { name: 'Embroidery', emoji: '🪡', desc: 'Intricate thread work' },
              { name: 'Sculpture', emoji: '🗿', desc: 'Stone & wood carvings' },
            ].map((cat) => (
              <Link 
                key={cat.name} 
                to={`/products?category=${cat.name.toLowerCase()}`}
                className="bg-amber-50 rounded-xl p-6 text-center hover:bg-amber-100 transition group"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition">{cat.emoji}</div>
                <h3 className="font-semibold text-amber-900">{cat.name}</h3>
                <p className="text-sm text-amber-600 mt-1">{cat.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-amber-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-amber-900 mb-2">Featured Artisans</h2>
            <p className="text-amber-700">Meet the master craftspeople behind our products</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: 'Ramesh Kumar', location: 'Jaipur, Rajasthan', craft: 'Block Printing', emoji: '👨‍🎨' },
              { name: 'Lakshmi Devi', location: 'Varanasi, Uttar Pradesh', craft: 'Banarasi Silk', emoji: '👩‍🎨' },
              { name: 'Mohan Sharma', location: 'Khurai, Madhya Pradesh', craft: 'Bidri Craft', emoji: '👨‍🔧' },
            ].map((artisan) => (
              <div key={artisan.name} className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition">
                <div className="text-5xl mb-4">{artisan.emoji}</div>
                <h3 className="text-xl font-semibold text-amber-900">{artisan.name}</h3>
                <p className="text-amber-600 text-sm mt-1">{artisan.location}</p>
                <p className="text-amber-800 mt-2 font-medium">{artisan.craft}</p>
                <Link 
                  to="/artisans" 
                  className="inline-block mt-4 text-amber-700 hover:text-amber-900 font-medium"
                >
                  View Profile →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-amber-900 text-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Preserve Heritage, Make a Difference</h2>
          <p className="text-amber-200 mb-8 max-w-2xl mx-auto">
            Your donations help traditional artisans sustain their craft and pass it on to future generations.
          </p>
          <Link 
            to="/donate" 
            className="inline-block bg-white text-amber-900 px-8 py-3 rounded-lg font-semibold hover:bg-amber-100 transition"
          >
            Donate Now
          </Link>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-amber-900 mb-2">Heritage Stories</h2>
            <p className="text-amber-700">Explore the rich history behind India&apos;s crafts</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: 'The Art of Banarasi Silk', category: 'Heritage', readTime: '5 min' },
              { title: 'Block Printing: A centuries-old tradition', category: 'Technique', readTime: '4 min' },
              { title: 'Preserving the dying art of Bidriware', category: 'Preservation', readTime: '6 min' },
            ].map((story) => (
              <article key={story.title} className="bg-amber-50 rounded-xl overflow-hidden hover:shadow-md transition">
                <div className="bg-amber-200 h-40 flex items-center justify-center text-5xl">📜</div>
                <div className="p-6">
                  <span className="text-xs text-amber-600 font-medium uppercase">{story.category}</span>
                  <h3 className="text-lg font-semibold text-amber-900 mt-2 mb-2">{story.title}</h3>
                  <p className="text-sm text-amber-600">{story.readTime} read</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
