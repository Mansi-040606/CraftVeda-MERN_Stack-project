import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ArtisanShell from '../../components/artisan/ArtisanShell';
import { Loading, ErrorState, EmptyState, Pager } from '../../components/admin/AdminShell';
import { toast, errMsg } from '../../components/Toast';
import { productService } from '../../services/productService';
import { inr } from '../../utils/format';
import ProductImage from '../../components/product/ProductImage';
import ImageManager from '../../components/product/ImageManager';

const CATEGORIES = ['textiles', 'pottery', 'jewelry', 'woodwork', 'metalwork', 'painting', 'sculpture', 'embroidery', 'other'];

const emptyForm = {
  name: '',
  description: '',
  price: '',
  category: 'textiles',
  craftType: '',
  stock: 1,
  images: [],
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
  images: form.images,
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
  const [pendingFiles, setPendingFiles] = useState([]);
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
    setPendingFiles([]);
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
      images: [...(product.images || [])],
      isActive: product.isActive,
    });
    setPendingFiles([]);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setPendingFiles([]);
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
      let id = editing?._id;

      if (editing) {
        await productService.update(editing._id, payload);
      } else {
        const res = await productService.create(payload);
        id = res.data.product?._id;
      }

      if (pendingFiles.length && id) {
        try {
          await productService.uploadImages(id, pendingFiles);
        } catch (err) {
          toast.error(errMsg(err, 'Saved, but some images failed to upload'));
          closeForm();
          load();
          return;
        }
      }

      toast.success(editing ? 'Product updated' : 'Product created');
      closeForm();
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
          <span className="text-sm text-ink-soft">{total} products</span>
          <button
            onClick={openAdd}
            className="rounded-sm bg-terracotta px-4 py-2 text-sm font-semibold text-white transition hover:bg-terracotta-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
          >
            Add Product
          </button>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-sm border border-ink/10 bg-white p-4">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Search your products"
          className="min-w-48 flex-1 rounded-sm border border-ink/15 px-3 py-2 text-sm focus:border-terracotta focus:outline-none"
        />
        <button onClick={load} className="rounded-sm bg-parchment px-4 py-2 text-sm text-ink transition hover:bg-linen">
          Search
        </button>
        <Link to="/artisan/dashboard" className="rounded-sm bg-parchment px-4 py-2 text-sm text-ink transition hover:bg-linen">
          Back to Dashboard
        </Link>
      </div>

      {showForm && (
        <form onSubmit={save} className="mb-4 grid grid-cols-1 gap-4 rounded-sm border border-ink/10 bg-white p-6 md:grid-cols-2">
          <h2 className="font-display text-xl font-semibold text-ink md:col-span-2">
            {editing ? 'Edit Product' : 'Add Product'}
          </h2>

          <label className="text-sm text-ink-soft">
            Name *
            <input
              required
              minLength={2}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-sm border border-ink/15 px-3 py-2 text-sm text-ink focus:border-terracotta focus:outline-none"
            />
          </label>

          <label className="text-sm text-ink-soft">
            Price (₹) *
            <input
              required
              type="number"
              min="1"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="mt-1 w-full rounded-sm border border-ink/15 px-3 py-2 text-sm text-ink focus:border-terracotta focus:outline-none"
            />
          </label>

          <label className="text-sm text-ink-soft md:col-span-2">
            Description *
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full rounded-sm border border-ink/15 px-3 py-2 text-sm text-ink focus:border-terracotta focus:outline-none"
            />
          </label>

          <label className="text-sm text-ink-soft">
            Category *
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="mt-1 w-full rounded-sm border border-ink/15 px-3 py-2 text-sm text-ink focus:border-terracotta focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-ink-soft">
            Craft type *
            <input
              required
              placeholder="e.g. Block Printing"
              value={form.craftType}
              onChange={(e) => setForm({ ...form, craftType: e.target.value })}
              className="mt-1 w-full rounded-sm border border-ink/15 px-3 py-2 text-sm text-ink focus:border-terracotta focus:outline-none"
            />
          </label>

          <label className="text-sm text-ink-soft">
            Stock *
            <input
              required
              type="number"
              min="0"
              step="1"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="mt-1 w-full rounded-sm border border-ink/15 px-3 py-2 text-sm text-ink focus:border-terracotta focus:outline-none"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="accent-terracotta"
            />
            Active (visible in the shop)
          </label>

          <div className="md:col-span-2">
            <ImageManager
              productId={editing?._id || null}
              images={form.images}
              onImagesChange={(images) => setForm((f) => ({ ...f, images }))}
              files={pendingFiles}
              onFilesChange={setPendingFiles}
            />
          </div>

          <div className="flex gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-sm bg-terracotta px-4 py-2 text-sm font-semibold text-white transition hover:bg-terracotta-dark disabled:opacity-50"
            >
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Product'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-sm bg-parchment px-4 py-2 text-sm text-ink transition hover:bg-linen"
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
          <div className="mt-4 text-center">
            <button onClick={load} className="rounded-sm bg-terracotta px-4 py-2 text-sm font-semibold text-white">
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
        <div className="overflow-x-auto rounded-sm border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-ink-soft">
                <th className="p-3 font-medium">Product</th>
                <th className="p-3 font-medium">Price</th>
                <th className="p-3 font-medium">Stock</th>
                <th className="p-3 font-medium">Rating</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id} className="border-b border-ink/5 last:border-0 hover:bg-parchment/40">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <ProductImage
                        src={product.images?.[0]}
                        alt={product.name}
                        frame="h-11 w-11 shrink-0 rounded-sm"
                        w={96}
                        h={96}
                      />
                      <div className="min-w-0">
                        <Link
                          to={`/product/${product._id}`}
                          className="block truncate font-medium text-ink hover:text-terracotta-dark"
                        >
                          {product.name}
                        </Link>
                        <span className="text-xs text-ink-faint">{product.craftType}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-ink">{inr(product.price)}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={stockDraft[product._id] ?? product.stock}
                        onChange={(e) => setStockDraft({ ...stockDraft, [product._id]: e.target.value })}
                        className="w-20 rounded-sm border border-ink/15 px-2 py-1 text-ink"
                      />
                      <button
                        onClick={() => saveStock(product)}
                        disabled={busyId === product._id}
                        className="text-xs text-terracotta-dark hover:text-ink disabled:opacity-40"
                      >
                        Save
                      </button>
                    </div>
                  </td>
                  <td className="p-3 text-ink-soft">
                    {product.reviewCount > 0
                      ? `${Number(product.averageRating).toFixed(1)} ★ (${product.reviewCount})`
                      : 'No reviews'}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => toggleActive(product)}
                      disabled={busyId === product._id}
                      className={`rounded-sm px-2 py-1 text-xs disabled:opacity-40 ${
                        product.isActive ? 'bg-moss-soft text-moss' : 'bg-clay-red-soft text-clay-red'
                      }`}
                    >
                      {product.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => openEdit(product)}
                        className="text-terracotta-dark hover:text-ink"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(product)}
                        className="text-clay-red hover:text-ink"
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
