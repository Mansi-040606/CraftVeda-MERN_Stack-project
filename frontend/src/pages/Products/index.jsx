import { useCallback, useEffect, useState } from 'react';
import { productService } from '../../services/productService';
import ProductCard, { ProductCardSkeleton } from '../../components/product/ProductCard';
import { CATEGORIES } from '../../constants/categories';
import { errMsg } from '../../components/Toast';

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest First' },
  { value: 'price', label: 'Price: Low to High' },
  { value: '-price', label: 'Price: High to Low' },
  { value: 'name', label: 'Name: A to Z' },
];

const PAGE_SIZE = 12;

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [retryKey, setRetryKey] = useState(0);

  // Filters — `search` is debounced into `appliedSearch`,
  // price inputs are applied with the Apply button / Enter.
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [priceInputs, setPriceInputs] = useState({ min: '', max: '' });
  const [sort, setSort] = useState('-createdAt');

  // Debounce the search box.
  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Any filter change resets to page 1.
  useEffect(() => {
    setPage(1);
  }, [appliedSearch, category, sort, minPrice, maxPrice]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: PAGE_SIZE, sort };
      if (appliedSearch) params.search = appliedSearch;
      if (category) params.category = category;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;

      const res = await productService.getAll(params);
      setProducts(res.data.products || []);
      setPages(res.data.pages || 1);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError(errMsg(err, 'Failed to load products'));
    } finally {
      setLoading(false);
    }
  }, [page, appliedSearch, category, sort, minPrice, maxPrice]);

  useEffect(() => {
    load();
  }, [load, retryKey]);

  const applyPrice = () => {
    setMinPrice(priceInputs.min.trim());
    setMaxPrice(priceInputs.max.trim());
  };

  const clearFilters = () => {
    setSearch('');
    setAppliedSearch('');
    setCategory('');
    setMinPrice('');
    setMaxPrice('');
    setPriceInputs({ min: '', max: '' });
    setSort('-createdAt');
    setPage(1);
  };

  const hasFilters = appliedSearch || category || minPrice || maxPrice;

  return (
    <div className="min-h-screen bg-cream py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row gap-8">
          {/* ---------- Filter sidebar ---------- */}
          <aside className="md:w-64 flex-shrink-0">
            <div className="bg-white rounded-sm border border-ink/10 p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-lg font-semibold text-ink">Filters</h2>
                {hasFilters && (
                  <button onClick={clearFilters} className="text-xs text-terracotta-dark hover:underline">
                    Clear
                  </button>
                )}
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-medium text-ink-soft mb-2">Search</h3>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full border border-ink/15 rounded-sm px-3 py-2 text-sm text-ink-soft"
                />
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-medium text-ink-soft mb-2">Category</h3>
                <div className="space-y-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(category === cat.value ? '' : cat.value)}
                      className={`block w-full text-left text-sm py-1 px-2 rounded transition ${
                        category === cat.value
                          ? 'bg-terracotta text-white'
                          : 'text-terracotta-dark hover:bg-parchment'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-medium text-ink-soft mb-2">Price Range (₹)</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={priceInputs.min}
                    onChange={(e) => setPriceInputs({ ...priceInputs, min: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && applyPrice()}
                    placeholder="Min"
                    className="w-full border border-ink/15 rounded-sm px-2 py-1.5 text-sm text-ink-soft"
                  />
                  <span className="text-ink-faint">–</span>
                  <input
                    type="number"
                    min="0"
                    value={priceInputs.max}
                    onChange={(e) => setPriceInputs({ ...priceInputs, max: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && applyPrice()}
                    placeholder="Max"
                    className="w-full border border-ink/15 rounded-sm px-2 py-1.5 text-sm text-ink-soft"
                  />
                </div>
                <button
                  onClick={applyPrice}
                  className="w-full mt-2 bg-parchment text-ink-soft text-sm py-1.5 rounded-sm hover:bg-linen transition"
                >
                  Apply Price
                </button>
              </div>
            </div>
          </aside>

          {/* ---------- Product list ---------- */}
          <main className="flex-1">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h1 className="font-display text-3xl font-semibold text-ink">
                All Products
                {!loading && !error && (
                  <span className="ml-2 text-base font-normal text-ink-faint">({total})</span>
                )}
              </h1>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-sm border border-ink/15 bg-white px-4 py-2 text-sm text-ink focus:border-terracotta focus:outline-none"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Loading skeleton */}
            {loading && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Error state */}
            {!loading && error && (
              <div className="bg-white rounded-sm border border-ink/10 p-12 text-center">
                <span className="text-5xl">⚠️</span>
                <h2 className="text-xl font-semibold text-ink mt-4">Something went wrong</h2>
                <p className="text-ink-soft mt-2">{error}</p>
                <button
                  onClick={() => setRetryKey((key) => key + 1)}
                  className="mt-4 bg-terracotta text-white px-6 py-2 rounded-sm hover:bg-terracotta-dark transition"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && products.length === 0 && (
              <div className="bg-white rounded-sm border border-ink/10 p-12 text-center">
                <span className="text-5xl">🔍</span>
                <h2 className="text-xl font-semibold text-ink mt-4">No products found</h2>
                <p className="text-ink-soft mt-2">
                  {hasFilters ? 'Try different filters or clear them.' : 'No products are listed yet.'}
                </p>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 bg-terracotta text-white px-6 py-2 rounded-sm hover:bg-terracotta-dark transition"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}

            {/* Product grid */}
            {!loading && !error && products.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                {pages > 1 && (
                  <div className="flex justify-center items-center mt-12 gap-4">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-4 py-2 bg-white text-ink-soft rounded-sm hover:bg-linen transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ← Prev
                    </button>
                    <span className="text-terracotta-dark text-sm">Page {page} of {pages}</span>
                    <button
                      onClick={() => setPage((p) => Math.min(pages, p + 1))}
                      disabled={page >= pages}
                      className="px-4 py-2 bg-white text-ink-soft rounded-sm hover:bg-linen transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default Products;
