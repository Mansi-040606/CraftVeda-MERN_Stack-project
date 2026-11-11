import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../../components/product/ProductCard';
import StarRating from '../../components/review/StarRating';
import { Loading, ErrorState, EmptyState } from '../../components/admin/AdminShell';
import { errMsg } from '../../components/Toast';
import { productService } from '../../services/productService';
import { artisanService } from '../../services/artisanService';
import { workshopService } from '../../services/workshopService';
import { craftStoryService } from '../../services/craftStoryService';
import { inr } from '../../utils/format';

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const upcomingSlot = (workshop) => {
  const slots = (workshop.schedule || [])
    .filter((s) => s.date && new Date(s.date).getTime() > Date.now())
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  return slots[0] || null;
};

const CATEGORIES = [
  { name: 'Textiles', emoji: '🧵', desc: 'Handwoven fabrics & garments' },
  { name: 'Pottery', emoji: '🏺', desc: 'Terracotta & ceramic artistry' },
  { name: 'Jewelry', emoji: '💎', desc: 'Traditional metal & beadwork' },
  { name: 'Woodwork', emoji: '🪵', desc: 'Carved furniture & decor' },
  { name: 'Metalwork', emoji: '⚱️', desc: 'Brass & bronze craftsmanship' },
  { name: 'Painting', emoji: '🎨', desc: 'Miniature & folk art' },
  { name: 'Embroidery', emoji: '🪡', desc: 'Intricate thread work' },
  { name: 'Sculpture', emoji: '🗿', desc: 'Stone & wood carvings' },
];

const emptySection = { items: [], error: null };

function Home() {
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [products, setProducts] = useState(emptySection);
  const [artisans, setArtisans] = useState(emptySection);
  const [workshops, setWorkshops] = useState(emptySection);
  const [stories, setStories] = useState(emptySection);
  // Counts that came back from the database; a stat is only rendered when its
  // request actually succeeded (never a hard-coded number).
  const [stats, setStats] = useState({ products: null, artisans: null, workshops: null });

  const load = useCallback(async () => {
    setLoading(true);
    setPageError(null);

    const [p, a, w, s] = await Promise.allSettled([
      productService.getAll({ limit: 8, sort: '-createdAt' }),
      artisanService.getAll({ limit: 3, sort: '-rating' }),
      workshopService.getAll({ limit: 6 }),
      craftStoryService.getAll({ limit: 3 }),
    ]);

    if ([p, a, w, s].every((r) => r.status === 'rejected')) {
      setPageError(errMsg(p.reason, 'Failed to load the homepage'));
      setLoading(false);
      return;
    }

    setProducts(
      p.status === 'fulfilled'
        ? { items: p.value.data.products || [], error: null }
        : { items: [], error: errMsg(p.reason, 'Failed to load products') }
    );
    setArtisans(
      a.status === 'fulfilled'
        ? { items: a.value.data.artisans || [], error: null }
        : { items: [], error: errMsg(a.reason, 'Failed to load artisans') }
    );
    setStories(
      s.status === 'fulfilled'
        ? { items: s.value.data.stories || [], error: null }
        : { items: [], error: errMsg(s.reason, 'Failed to load stories') }
    );

    if (w.status === 'fulfilled') {
      const list = w.value.data.workshops || [];
      // Newest schedule first for dated workshops; undated ones follow.
      list.sort((x, y) => {
        const sx = upcomingSlot(x)?.date;
        const sy = upcomingSlot(y)?.date;
        if (sx && sy) return new Date(sx) - new Date(sy);
        if (sx) return -1;
        if (sy) return 1;
        return new Date(y.createdAt || 0) - new Date(x.createdAt || 0);
      });
      setWorkshops({ items: list, error: null });
      setStats({
        products: p.status === 'fulfilled' ? p.value.data.total ?? null : null,
        artisans: a.status === 'fulfilled' ? a.value.data.total ?? null : null,
        workshops: w.value.data.total ?? null,
      });
    } else {
      setWorkshops({ items: [], error: errMsg(w.reason, 'Failed to load workshops') });
      setStats({
        products: p.status === 'fulfilled' ? p.value.data.total ?? null : null,
        artisans: a.status === 'fulfilled' ? a.value.data.total ?? null : null,
        workshops: null,
      });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const statCards = [
    { key: 'artisans', value: stats.artisans, label: 'Verified artisans', to: '/artisans' },
    { key: 'products', value: stats.products, label: 'Handmade products', to: '/products' },
    { key: 'workshops', value: stats.workshops, label: 'Live workshops', to: '/workshops' },
  ].filter((stat) => stat.value !== null && stat.value !== undefined);

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

      {pageError && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <ErrorState message={pageError} />
            <div className="text-center mt-4">
              <button onClick={load} className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm">
                Retry
              </button>
            </div>
          </div>
        </section>
      )}

      {!pageError && loading && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <Loading />
          </div>
        </section>
      )}

      {!pageError && !loading && statCards.length > 0 && (
        <section className="py-10 bg-white border-b border-amber-100">
          <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {statCards.map((stat) => (
              <Link key={stat.key} to={stat.to} className="group">
                <p className="text-3xl font-bold text-amber-900 group-hover:text-amber-700 transition">
                  {stat.value.toLocaleString('en-IN')}
                </p>
                <p className="text-sm text-amber-600 mt-1">{stat.label}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!pageError && !loading && (
        <>
          <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-amber-900 mb-2">Fresh from the Workshop</h2>
                  <p className="text-amber-700">The latest handmade pieces added by our artisans</p>
                </div>
                <Link to="/products" className="text-amber-700 hover:text-amber-900 font-medium hidden sm:block">
                  View all →
                </Link>
              </div>

              {products.error && <ErrorState message={products.error} />}
              {!products.error && products.items.length === 0 && (
                <EmptyState message="No products yet — check back soon." />
              )}
              {!products.error && products.items.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {products.items.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="py-16 bg-amber-50">
            <div className="max-w-7xl mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-amber-900 mb-2">Shop by Category</h2>
                <p className="text-amber-700">Explore our curated collection of traditional crafts</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {CATEGORIES.map((cat) => (
                  <Link
                    key={cat.name}
                    to={`/products?category=${cat.name.toLowerCase()}`}
                    className="bg-white rounded-xl p-6 text-center hover:bg-amber-100 transition group"
                  >
                    <div className="text-4xl mb-3 group-hover:scale-110 transition">{cat.emoji}</div>
                    <h3 className="font-semibold text-amber-900">{cat.name}</h3>
                    <p className="text-sm text-amber-600 mt-1">{cat.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-amber-900 mb-2">Featured Artisans</h2>
                  <p className="text-amber-700">Meet the master craftspeople behind our products</p>
                </div>
                <Link to="/artisans" className="text-amber-700 hover:text-amber-900 font-medium hidden sm:block">
                  View all →
                </Link>
              </div>

              {artisans.error && <ErrorState message={artisans.error} />}
              {!artisans.error && artisans.items.length === 0 && (
                <EmptyState message="No verified artisans yet." />
              )}
              {!artisans.error && artisans.items.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {artisans.items.map((artisan) => (
                    <Link
                      key={artisan._id}
                      to={`/artisan/${artisan._id}`}
                      className="bg-amber-50 rounded-xl p-6 shadow-md hover:shadow-lg transition"
                    >
                      <div className="bg-amber-100 rounded-xl h-32 mb-4 flex items-center justify-center overflow-hidden">
                        {artisan.profileImage ? (
                          <img src={artisan.profileImage} alt={artisan.businessName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-6xl">👩‍🎨</span>
                        )}
                      </div>
                      <h3 className="text-xl font-semibold text-amber-900">{artisan.businessName}</h3>
                      <p className="text-amber-600 text-sm mt-1">
                        {[artisan.location?.city, artisan.location?.state].filter(Boolean).join(', ') || 'India'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <StarRating value={artisan.rating || 0} size="text-sm" />
                        <span className="text-sm text-amber-600">
                          {artisan.reviewCount ? `(${artisan.reviewCount})` : ''}
                        </span>
                      </div>
                      <p className="text-amber-800 mt-2 font-medium text-sm">
                        {(artisan.craftTypes || []).join(', ')}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="py-16 bg-amber-50">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-amber-900 mb-2">Workshops</h2>
                  <p className="text-amber-700">Learn traditional crafts directly from master artisans</p>
                </div>
                <Link to="/workshops" className="text-amber-700 hover:text-amber-900 font-medium hidden sm:block">
                  View all →
                </Link>
              </div>

              {workshops.error && <ErrorState message={workshops.error} />}
              {!workshops.error && workshops.items.length === 0 && (
                <EmptyState message="No workshops listed right now." />
              )}
              {!workshops.error && workshops.items.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {workshops.items.slice(0, 3).map((workshop) => {
                    const slot = upcomingSlot(workshop);
                    return (
                      <div key={workshop._id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition flex flex-col">
                        <div className="bg-amber-100 h-36 flex items-center justify-center text-5xl">
                          {workshop.images?.[0] ? (
                            <img src={workshop.images[0]} alt={workshop.title} className="w-full h-full object-cover" />
                          ) : (
                            <span>🧵</span>
                          )}
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                          <span className="text-xs text-amber-600 font-medium uppercase">{workshop.craftType}</span>
                          <h3 className="font-semibold text-amber-900 mt-1">{workshop.title}</h3>
                          <p className="text-sm text-amber-600 mt-1">by {workshop.artisan?.businessName || 'Artisan'}</p>
                          <p className="text-sm text-amber-700 mt-2">
                            📅 {slot ? formatDate(slot.date) : 'Schedule to be announced'}
                          </p>
                          <div className="mt-auto pt-4 flex items-center justify-between">
                            <span className="font-bold text-amber-900">{inr(workshop.price)}</span>
                            <Link
                              to={`/workshop/${workshop._id}`}
                              className="text-amber-700 hover:text-amber-900 font-medium text-sm"
                            >
                              Details →
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-amber-900 mb-2">Heritage Stories</h2>
                  <p className="text-amber-700">Explore the rich history behind India&apos;s crafts</p>
                </div>
                <Link to="/stories" className="text-amber-700 hover:text-amber-900 font-medium hidden sm:block">
                  View all →
                </Link>
              </div>

              {stories.error && <ErrorState message={stories.error} />}
              {!stories.error && stories.items.length === 0 && (
                <EmptyState message="No stories published yet." />
              )}
              {!stories.error && stories.items.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {stories.items.map((story) => (
                    <article key={story._id} className="bg-amber-50 rounded-xl overflow-hidden hover:shadow-md transition">
                      <div className="bg-amber-200 h-40 flex items-center justify-center text-5xl">📜</div>
                      <div className="p-6">
                        <span className="text-xs text-amber-600 font-medium uppercase">{story.category}</span>
                        <h3 className="text-lg font-semibold text-amber-900 mt-2 mb-2">{story.title}</h3>
                        <p className="text-sm text-amber-700 line-clamp-3">{story.excerpt || story.content}</p>
                        <Link
                          to={`/stories/${story.slug}`}
                          className="inline-block mt-4 text-amber-700 hover:text-amber-900 font-medium"
                        >
                          Read More →
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default Home;
