import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loading, ErrorState, EmptyState, Pager } from '../../components/admin/AdminShell';
import { toast, errMsg } from '../../components/Toast';
import { giTagService } from '../../services/giTagService';
import { artisanService } from '../../services/artisanService';
import { inr } from '../../utils/format';

// Must match the allowed list in backend/src/routes/giTags.js
const GI_TYPES = ['textiles', 'pottery', 'jewelry', 'woodwork', 'metalwork', 'painting', 'sculpture', 'embroidery', 'other'];

const typeEmoji = (type = '') => {
  const t = type.toLowerCase();
  if (t.includes('textile')) return '🧵';
  if (t.includes('pottery')) return '🏺';
  if (t.includes('metal')) return '⚱️';
  if (t.includes('embroid')) return '🪡';
  if (t.includes('paint')) return '🎨';
  if (t.includes('wood') || t.includes('sculpt')) return '🪵';
  return '💎';
};

function GISearch() {
  const [giTags, setGITags] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchInput, setSearchInput] = useState('');
  const [stateInput, setStateInput] = useState('');
  const [typeInput, setTypeInput] = useState('');
  const [applied, setApplied] = useState({ search: '', state: '', type: '' });

  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 12 };
      if (applied.search) params.search = applied.search;
      if (applied.state) params.state = applied.state;
      if (applied.type) params.type = applied.type;
      const res = await giTagService.getAll(params);
      setGITags(res.data.giTags || []);
      setPages(res.data.pages || 0);
      setTotal(res.data.total || 0);
    } catch (err) {
      const message = errMsg(err, 'Failed to load GI tags');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, applied]);

  useEffect(() => {
    load();
  }, [load]);

  const applyFilters = (e) => {
    e.preventDefault();
    setPage(1);
    setApplied({
      search: searchInput.trim(),
      state: stateInput.trim(),
      type: typeInput,
    });
  };

  const clearFilters = () => {
    setSearchInput('');
    setStateInput('');
    setTypeInput('');
    setPage(1);
    setApplied({ search: '', state: '', type: '' });
  };

  const openDetail = async (giTag) => {
    setSelected({ ...giTag, detailLoading: true, artisans: [], products: [], detailError: null });
    try {
      const res = await giTagService.getById(giTag._id);
      const full = res.data.giTag;

      const artisanIds = (full.artisans || []).slice(0, 3);
      const artisanResults = await Promise.allSettled(
        artisanIds.map((id) => artisanService.getById(id))
      );
      const linkedArtisans = artisanResults
        .filter((r) => r.status === 'fulfilled')
        .map((r) => r.value.data.artisan)
        .filter(Boolean);

      const productResults = await Promise.allSettled(
        linkedArtisans.map((a) => artisanService.getProducts(a._id))
      );
      const seen = new Set();
      const linkedProducts = productResults
        .flatMap((r) => (r.status === 'fulfilled' ? r.value.data.products || [] : []))
        .filter((p) => {
          if (seen.has(p._id)) return false;
          seen.add(p._id);
          return true;
        })
        .slice(0, 6);

      setSelected({
        ...full,
        detailLoading: false,
        artisans: linkedArtisans,
        products: linkedProducts,
        detailError: null,
      });
    } catch (err) {
      setSelected((prev) => ({
        ...prev,
        detailLoading: false,
        detailError: errMsg(err, 'Failed to load this GI tag'),
      }));
    }
  };

  return (
    <div className="min-h-screen bg-cream py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-ink mb-4">GI Tag Products</h1>
          <p className="text-terracotta-dark max-w-2xl mx-auto">
            Geographical Indication (GI) tags certify the authenticity and origin of traditional
            Indian crafts. Explore the GI tags registered on CraftVeda.
          </p>
        </div>

        <form onSubmit={applyFilters} className="bg-white rounded-sm border border-ink/10 p-4 mb-8 flex flex-wrap gap-3 items-center">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name..."
            aria-label="Search GI tags by name"
            className="border border-ink/10 rounded-sm px-3 py-2 text-sm flex-1 min-w-40"
          />
          <input
            value={stateInput}
            onChange={(e) => setStateInput(e.target.value)}
            placeholder="State (e.g. Rajasthan)"
            aria-label="Filter GI tags by state"
            className="border border-ink/10 rounded-sm px-3 py-2 text-sm min-w-40"
          />
          <select
            value={typeInput}
            onChange={(e) => setTypeInput(e.target.value)}
            aria-label="Filter GI tags by craft type"
            className="border border-ink/10 rounded-sm px-3 py-2 text-sm"
          >
            <option value="">All crafts</option>
            {GI_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
          <button type="submit" className="px-4 py-2 bg-terracotta text-white rounded-sm text-sm">
            Search
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="px-4 py-2 bg-parchment text-ink-soft rounded-sm text-sm"
          >
            Clear
          </button>
          {!loading && !error && (
            <span className="text-sm text-ink-soft ml-auto">{total} GI tag{total === 1 ? '' : 's'}</span>
          )}
        </form>

        {loading && <Loading />}
        {!loading && error && (
          <div>
            <ErrorState message={error} />
            <div className="text-center mt-4">
              <button onClick={load} className="px-4 py-2 bg-terracotta text-white rounded-sm text-sm">
                Retry
              </button>
            </div>
          </div>
        )}
        {!loading && !error && giTags.length === 0 && (
          <EmptyState message="No GI tags match your search — try clearing the filters." />
        )}

        {!loading && !error && giTags.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {giTags.map((giTag) => (
              <button
                key={giTag._id}
                type="button"
                onClick={() => openDetail(giTag)}
                className="bg-white rounded-sm border border-ink/10 p-6 hover:shadow-lg transition text-left cursor-pointer"
              >
                <div className="bg-parchment rounded-sm h-24 flex items-center justify-center text-4xl mb-4">
                  {typeEmoji(giTag.type)}
                </div>
                <h3 className="font-bold text-ink">{giTag.name}</h3>
                <p className="text-sm text-ink-soft mt-1">📍 {giTag.location?.state}</p>
                <p className="text-sm text-ink-soft mt-2">
                  <strong>Type:</strong> {giTag.type}
                </p>
                {giTag.products?.length > 0 && (
                  <p className="text-sm text-ink-soft">
                    <strong>Products:</strong> {giTag.products.join(', ')}
                  </p>
                )}
                <span className="inline-block mt-4 text-terracotta-dark hover:text-ink font-medium text-sm">
                  View details →
                </span>
              </button>
            ))}
          </div>
        )}

        <Pager page={page} pages={pages} onChange={setPage} />
      </div>

      {selected && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
          role="presentation"
        >
          <div
            className="bg-white rounded-sm max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 relative"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={selected.name}
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute top-3 right-4 text-2xl text-ink-soft hover:text-ink"
              aria-label="Close"
            >
              ×
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div className="bg-parchment rounded-sm w-16 h-16 flex items-center justify-center text-3xl shrink-0">
                {typeEmoji(selected.type)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-ink">{selected.name}</h2>
                <p className="text-sm text-ink-soft">
                  📍 {[selected.location?.district, selected.location?.state].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>

            {selected.detailLoading && <Loading />}

            {!selected.detailLoading && selected.detailError && (
              <ErrorState message={selected.detailError} />
            )}

            {!selected.detailLoading && !selected.detailError && (
              <div className="space-y-5">
                <p className="text-ink-soft">{selected.description}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="bg-cream rounded-sm p-4">
                    <p className="font-semibold text-ink mb-1">Craft type</p>
                    <p className="text-terracotta-dark">{selected.type}</p>
                  </div>
                  <div className="bg-cream rounded-sm p-4">
                    <p className="font-semibold text-ink mb-1">Region</p>
                    <p className="text-terracotta-dark">
                      {[selected.location?.region, selected.location?.district, selected.location?.state]
                        .filter(Boolean)
                        .join(', ') || 'India'}
                    </p>
                  </div>
                </div>

                {selected.products?.length > 0 && (
                  <div>
                    <p className="font-semibold text-ink mb-2 text-sm">Known products</p>
                    <div className="flex flex-wrap gap-2">
                      {selected.products.map((name) => (
                        <span key={name} className="bg-parchment text-ink-soft text-xs px-2 py-1 rounded-full">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selected.technique && (
                  <div>
                    <p className="font-semibold text-ink mb-1 text-sm">Technique</p>
                    <p className="text-sm text-terracotta-dark">{selected.technique}</p>
                  </div>
                )}
                {selected.history && (
                  <div>
                    <p className="font-semibold text-ink mb-1 text-sm">History</p>
                    <p className="text-sm text-terracotta-dark">{selected.history}</p>
                  </div>
                )}
                {selected.significance && (
                  <div>
                    <p className="font-semibold text-ink mb-1 text-sm">Why it matters</p>
                    <p className="text-sm text-terracotta-dark">{selected.significance}</p>
                  </div>
                )}

                <div>
                  <p className="font-semibold text-ink mb-2 text-sm">Artisans with this GI tag</p>
                  {selected.artisans.length === 0 ? (
                    <p className="text-sm text-ink-soft">No linked artisans yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {selected.artisans.map((artisan) => (
                        <Link
                          key={artisan._id}
                          to={`/artisan/${artisan._id}`}
                          onClick={() => setSelected(null)}
                          className="bg-cream border border-ink/10 rounded-sm px-3 py-2 text-sm text-ink-soft hover:bg-linen"
                        >
                          {artisan.businessName} →
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="font-semibold text-ink mb-2 text-sm">Related products</p>
                  {selected.products.length === 0 ? (
                    <p className="text-sm text-ink-soft">
                      No products linked yet.{' '}
                      <Link to="/products" onClick={() => setSelected(null)} className="text-terracotta-dark underline">
                        Browse all products
                      </Link>
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selected.products.map((product) => (
                        <Link
                          key={product._id}
                          to={`/product/${product._id}`}
                          onClick={() => setSelected(null)}
                          className="flex items-center justify-between bg-cream border border-ink/10 rounded-sm px-3 py-2 text-sm hover:bg-linen"
                        >
                          <span className="text-ink font-medium truncate">{product.name}</span>
                          <span className="text-terracotta-dark shrink-0 ml-2">{inr(product.price)}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GISearch;
