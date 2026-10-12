import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ArtisanShell from '../../components/artisan/ArtisanShell';
import { Loading, ErrorState, EmptyState, Pager } from '../../components/admin/AdminShell';
import { toast, errMsg } from '../../components/Toast';
import { productService } from '../../services/productService';
import { inr } from '../../utils/format';

const CATEGORIES = ['textiles', 'pottery', 'jewelry', 'woodwork', 'metalwork', 'painting', 'sculpture', 'embroidery', 'other'];

const emptyForm = {
  name: '',
  description: '',
  price: '',
  category: 'textiles',
  craftType: '',
  stock: 1,
  image: '',
  isActive: true,
};

// Client-side validation that mirrors the backend product validators.
const validateForm = (form) => {
  if (form.name.trim().length < 2) return 'Name must be at least 2 characters';
  if (!form.description.trim()) return 'Description is required';
  const price = Number(form.price);
  if (!Number.isFinite(price) || price <= 0) return 'Price must be greater than 0';
  if (!CATEGORIES.includes(form.category)) return 'Please pick a category';
  if (!form.craftType.trim()) return 'Craft type is required';
  const stock = Number(form.stock);
  if (!Number.isInteger(stock) || stock < 0) return 'Stock must be a whole number of 0 or more';
  return null;
};

const buildPayload = (form) => ({
  name: form.name.trim(),
  description: form.description.trim(),
  price: Number(form.price),
  category: form.category,
  craftType: form.craftType.trim(),
  stock: Number(form.stock),
  isActive: form.isActive,
  images: form.image.split(',').map((url) => url.trim()).filter(Boolean),
});

function ArtisanProducts() {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [stockDraft, setStockDraft] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      const res = await productService.getMine(params);
      setProducts(res.data.products || []);
      setPages(res.data.pages || 0);
      setTotal(res.data.total || 0);
      const draft = {};
      (res.data.products || []).forEach((p) => { draft[p._id] = p.stock; });
      setStockDraft(draft);
    } catch (err) {
      const message = errMsg(err, 'Failed to load your products');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      craftType: product.craftType,
      stock: product.stock,
      image: (product.images || []).join(', '),
      isActive: product.isActive,
    });
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const problem = validateForm(form);
    if (problem) {
      toast.error(problem);
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(form);
      if (editing) {
        await productService.update(editing._id, payload);
        toast.success('Product updated');
      } else {
        await productService.create(payload);
        toast.success('Product created');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to save product'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (product) => {
    setBusyId(product._id);
    try {
      await productService.patch(product._id, { isActive: !product.isActive });
      toast.success(product.isActive ? 'Product deactivated' : 'Product activated');
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to update product'));
    } finally {
      setBusyId(null);
    }
  };

  const saveStock = async (product) => {
    const value = Number(stockDraft[product._id]);
    if (!Number.isInteger(value) || value < 0) {
      toast.error('Stock must be a whole number of 0 or more');
      return;
    }
    setBusyId(product._id);
    try {
      await productService.patch(product._id, { stock: value });
      toast.success('Stock updated');
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to update stock'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setBusyId(product._id);
    try {
      await productService.delete(product._id);
      toast.success('Product deleted');
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to delete product'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ArtisanShell
      title="My Products"
      actions={
        <div className="flex items-center gap-3">
          <span className="text-sm text-amber-600">{total} products</span>
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm hover:bg-amber-800 transition"
          >
            Add Product
          </button>
        </div>
      }
    >
      <div className="bg-white rounded-xl shadow-md p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Search your products"
          className="border border-amber-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-48"
        />
        <button onClick={load} className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm">
          Search
        </button>
        <Link to="/artisan/dashboard" className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm">
          Back to Dashboard
        </Link>
      </div>

      {showForm && (
        <form onSubmit={save} className="bg-white rounded-xl shadow-md p-6 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <h2 className="font-bold text-amber-900 md:col-span-2">
            {editing ? 'Edit Product' : 'Add Product'}
          </h2>

          <label className="text-sm text-amber-800">
            Name *
            <input
              required
              minLength={2}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-amber-800">
            Price (₹) *
            <input
              required
              type="number"
              min="1"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-amber-800 md:col-span-2">
            Description *
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-amber-800">
            Category *
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-amber-800">
            Craft type *
            <input
              required
              placeholder="e.g. Block Printing"
              value={form.craftType}
              onChange={(e) => setForm({ ...form, craftType: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-amber-800">
            Stock *
            <input
              required
              type="number"
              min="0"
              step="1"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-amber-800">
            Image URL
            <input
              placeholder="https://... (comma-separate for several)"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-amber-800">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active (visible in the shop)
          </label>

          <div className="flex gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Product'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && <Loading />}
      {!loading && error && (
        <div>
          <ErrorState message={error} />
          <div className="text-center mt-4">
            <button onClick={load} className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm">
              Retry
            </button>
          </div>
        </div>
      )}
      {!loading && !error && products.length === 0 && (
        <EmptyState
          message={search ? 'No products match your search' : 'You have no products yet — add your first one'}
        />
      )}

      {!loading && !error && products.length > 0 && (
        <div className="bg-white rounded-xl shadow-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-amber-600 border-b border-amber-100">
                <th className="p-3">Product</th>
                <th className="p-3">Price</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Rating</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id} className="border-b border-amber-50">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-amber-100 overflow-hidden flex items-center justify-center shrink-0">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>🏺</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/product/${product._id}`}
                          className="font-medium text-amber-900 hover:text-amber-700 truncate block"
                        >
                          {product.name}
                        </Link>
                        <span className="text-xs text-amber-500">{product.craftType}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-amber-900">{inr(product.price)}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={stockDraft[product._id] ?? product.stock}
                        onChange={(e) => setStockDraft({ ...stockDraft, [product._id]: e.target.value })}
                        className="w-20 border border-amber-200 rounded px-2 py-1"
                      />
                      <button
                        onClick={() => saveStock(product)}
                        disabled={busyId === product._id}
                        className="text-amber-700 hover:text-amber-900 disabled:opacity-40 text-xs"
                      >
                        Save
                      </button>
                    </div>
                  </td>
                  <td className="p-3 text-amber-700">
                    {product.reviewCount > 0
                      ? `${Number(product.averageRating).toFixed(1)} ★ (${product.reviewCount})`
                      : 'No reviews'}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => toggleActive(product)}
                      disabled={busyId === product._id}
                      className={`px-2 py-1 rounded text-xs disabled:opacity-40 ${
                        product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {product.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => openEdit(product)}
                        className="text-amber-700 hover:text-amber-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(product)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={page} pages={pages} onChange={setPage} />
    </ArtisanShell>
  );
}

export default ArtisanProducts;
