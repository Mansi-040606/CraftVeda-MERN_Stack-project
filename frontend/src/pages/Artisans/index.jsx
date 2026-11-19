import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { artisanService } from '../../services/artisanService';
import { errMsg } from '../../components/Toast';
import StarRating from '../../components/review/StarRating';
import ProductImage from '../../components/product/ProductImage';

const CRAFT_TYPES = ['textiles', 'pottery', 'jewelry', 'woodwork', 'metalwork', 'painting', 'sculpture', 'embroidery'];

function Artisans() {
  const [artisans, setArtisans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filter draft (applied on submit) + applied values.
  const [stateInput, setStateInput] = useState('');
  const [craftInput, setCraftInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [applied, setApplied] = useState({ state: '', craftType: '', search: '' });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params = { page, limit: 12 };
    if (applied.state) params.state = applied.state;
    if (applied.craftType) params.craftType = applied.craftType;
    if (applied.search) params.search = applied.search;

    artisanService
      .getAll(params)
      .then((res) => {
        if (cancelled) return;
        setArtisans(res.data.artisans);
        setPages(res.data.pages || 1);
        setTotal(res.data.total || 0);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(errMsg(err, 'Failed to load artisans'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [page, applied]);

  const applyFilters = (e) => {
    e.preventDefault();
    setPage(1);
    setApplied({ state: stateInput.trim(), craftType: craftInput, search: searchInput.trim() });
  };

  const clearFilters = () => {
    setStateInput('');
    setCraftInput('');
    setSearchInput('');
    setPage(1);
    setApplied({ state: '', craftType: '', search: '' });
  };

  return (
    <div className="min-h-screen bg-cream py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-ink mb-4">Our Artisans</h1>
          <p className="text-terracotta-dark max-w-2xl mx-auto">
            Meet the master craftspeople who preserve India&apos;s rich artistic heritage.
            Each artisan brings generations of expertise and passion to their craft.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 mb-8">
          <div className="md:w-64 bg-white rounded-sm border border-ink/10 p-6 h-fit">
            <h3 className="font-semibold text-ink mb-4">Filter Artisans</h3>
            <form onSubmit={applyFilters}>
              <div className="mb-4">
                <label htmlFor="artisan-search" className="text-sm text-ink-soft font-medium">Search</label>
                <input
                  id="artisan-search"
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Name or craft..."
                  className="w-full mt-1 border border-ink/15 rounded-sm px-3 py-2 text-ink-soft"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="artisan-state" className="text-sm text-ink-soft font-medium">State</label>
                <input
                  id="artisan-state"
                  type="text"
                  value={stateInput}
                  onChange={(e) => setStateInput(e.target.value)}
                  placeholder="e.g. Rajasthan"
                  className="w-full mt-1 border border-ink/15 rounded-sm px-3 py-2 text-ink-soft"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="artisan-craft" className="text-sm text-ink-soft font-medium">Craft Type</label>
                <select
                  id="artisan-craft"
                  value={craftInput}
                  onChange={(e) => setCraftInput(e.target.value)}
                  className="w-full mt-1 border border-ink/15 rounded-sm px-3 py-2 text-ink-soft"
                >
                  <option value="">All Crafts</option>
                  {CRAFT_TYPES.map((craft) => (
                    <option key={craft} value={craft}>
                      {craft.charAt(0).toUpperCase() + craft.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-terracotta text-white py-2 rounded-sm hover:bg-terracotta-dark transition"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="w-full mt-2 border border-ink/15 text-ink-soft py-2 rounded-sm hover:bg-parchment transition"
              >
                Clear
              </button>
            </form>
          </div>

          <div className="flex-1">
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-sm border border-ink/10 overflow-hidden animate-pulse">
                    <div className="bg-parchment h-40" />
                    <div className="p-6 space-y-3">
                      <div className="h-4 bg-parchment rounded w-2/3" />
                      <div className="h-3 bg-parchment rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="bg-white rounded-sm border border-ink/10 p-12 text-center">
                <span className="text-4xl">⚠️</span>
                <p className="text-red-600 mt-4">{error}</p>
              </div>
            )}

            {!loading && !error && artisans.length === 0 && (
              <div className="bg-white rounded-sm border border-ink/10 p-12 text-center">
                <p className="text-terracotta-dark">No artisans match your filters.</p>
              </div>
            )}

            {!loading && !error && (
              <>
                <p className="text-sm text-ink-soft mb-4">{total} artisan{total === 1 ? '' : 's'} found</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {artisans.map((artisan) => (
                    <Link
                      key={artisan._id}
                      to={`/artisan/${artisan._id}`}
                      className="bg-white rounded-sm border border-ink/10 overflow-hidden hover:shadow-lg transition group"
                    >
                      <div className="bg-parchment h-40 flex items-center justify-center overflow-hidden">
                        {artisan.profileImage ? (
                          <ProductImage
                            src={artisan.profileImage}
                            alt={artisan.businessName}
                            frame="h-full w-full"
                            w={640}
                            h={400}
                            imgClassName="transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <span className="text-7xl">👩‍🎨</span>
                        )}
                      </div>
                      <div className="p-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-ink group-hover:text-terracotta-dark transition">
                              {artisan.businessName}
                            </h3>
                            <p className="text-sm text-ink-soft mt-1">
                              {[artisan.location?.city, artisan.location?.state].filter(Boolean).join(', ') || 'India'}
                            </p>
                          </div>
                          {artisan.isVerified && (
                            <span className="text-green-600 text-sm" title="Verified artisan">✓</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <StarRating value={artisan.rating || 0} size="text-sm" />
                          <span className="text-sm text-ink-soft">
                            {artisan.reviewCount ? `(${artisan.reviewCount})` : ''}
                          </span>
                        </div>
                        <p className="text-ink-soft mt-2 font-medium text-sm">
                          {(artisan.craftTypes || []).join(', ')}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>

                {pages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-8">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-4 py-2 border border-ink/15 rounded-sm text-ink-soft hover:bg-parchment disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="text-ink-soft">Page {page} of {pages}</span>
                    <button
                      onClick={() => setPage((p) => Math.min(pages, p + 1))}
                      disabled={page >= pages}
                      className="px-4 py-2 border border-ink/15 rounded-sm text-ink-soft hover:bg-parchment disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Artisans;
