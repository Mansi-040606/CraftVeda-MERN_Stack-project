import { useCallback, useEffect, useState } from 'react';
import adminApi from '../../services/adminApi';
import { toast, errMsg } from '../../components/Toast';
import { AdminShell, Loading, ErrorState, EmptyState, Pager } from '../../components/admin/AdminShell';

const CATEGORIES = ['textiles', 'pottery', 'jewelry', 'woodwork', 'metalwork', 'painting', 'sculpture', 'embroidery', 'other'];
const inr = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const emptyForm = {
  name: '', description: '', price: '', category: 'textiles', craftType: '', stock: 1, isActive: true, artisan: ''
};

function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [artisans, setArtisans] = useState([]);
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
      const res = await adminApi.products(params);
      setProducts(res.data.products || []);
      setPages(res.data.pages || 0);
      setTotal(res.data.total || 0);
      const draft = {};
      (res.data.products || []).forEach((p) => { draft[p._id] = p.stock; });
      setStockDraft(draft);
    } catch (err) {
      const message = errMsg(err, 'Failed to load products');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    adminApi.artisans({ limit: 100 })
      .then((res) => setArtisans(res.data.artisans || []))
      .catch(() => setArtisans([]));
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, artisan: artisans[0]?._id || '' });
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
      isActive: product.isActive,
      artisan: product.artisan?._id || product.artisan || ''
    });
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock)
      };
      if (editing) {
        await adminApi.updateProduct(editing._id, payload);
        toast.success('Product updated');
      } else {
        await adminApi.createProduct(payload);
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
      await adminApi.patchProduct(product._id, { isActive: !product.isActive });
      toast.success(product.isActive ? 'Product deactivated' : 'Product activated');
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to update product'));
    } finally {
      setBusyId(null);
    }
  };

  const saveStock = async (product) => {
    setBusyId(product._id);
    try {
      await adminApi.patchProduct(product._id, { stock: Number(stockDraft[product._id]) });
      toast.success('Stock updated');
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to update stock'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (product) => {
    if (!window.confirm(`Delete "${product.name}"?`)) return;
    setBusyId(product._id);
    try {
      await adminApi.deleteProduct(product._id);
      toast.success('Product deleted');
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to delete product'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell title="Products">
      <div className="bg-white rounded-xl shadow-md p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Search products"
          className="border border-amber-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-48"
        />
        <button onClick={load} className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm">
          Search
        </button>
        <button onClick={openAdd} className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm">
          Add Product
        </button>
        <span className="text-sm text-amber-600">{total} products</span>
      </div>

      {showForm && (
        <form onSubmit={save} className="bg-white rounded-xl shadow-md p-6 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <h2 className="font-bold text-amber-900 md:col-span-2">{editing ? 'Edit Product' : 'Add Product'}</h2>
          <input required minLength={2} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border border-amber-200 rounded-lg px-3 py-2 text-sm" />
          <input required type="number" min="1" step="0.01" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="border border-amber-200 rounded-lg px-3 py-2 text-sm" />
          <textarea required placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border border-amber-200 rounded-lg px-3 py-2 text-sm md:col-span-2" rows={3} />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="border border-amber-200 rounded-lg px-3 py-2 text-sm">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input required placeholder="Craft type (e.g. Block Printing)" value={form.craftType} onChange={(e) => setForm({ ...form, craftType: e.target.value })} className="border border-amber-200 rounded-lg px-3 py-2 text-sm" />
          <input required type="number" min="0" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="border border-amber-200 rounded-lg px-3 py-2 text-sm" />
          <select required value={form.artisan} onChange={(e) => setForm({ ...form, artisan: e.target.value })} className="border border-amber-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Select artisan</option>
            {artisans.map((a) => <option key={a._id} value={a._id}>{a.businessName}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-amber-800">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Active
          </label>
          <div className="flex gap-3 md:col-span-2">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm disabled:opacity-50">
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Product'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && <Loading />}
      {!loading && error && <ErrorState message={error} />}
      {!loading && !error && products.length === 0 && <EmptyState message="No products found" />}

      {!loading && !error && products.length > 0 && (
        <div className="bg-white rounded-xl shadow-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-amber-600 border-b border-amber-100">
                <th className="p-3">Product</th>
                <th className="p-3">Category</th>
                <th className="p-3">Price</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Active</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id} className="border-b border-amber-50">
                  <td className="p-3 font-medium text-amber-900">
                    {product.name}
                    <span className="block text-xs text-amber-500">{product.artisan?.businessName}</span>
                  </td>
                  <td className="p-3 text-amber-700">{product.category}</td>
                  <td className="p-3 text-amber-900">{inr(product.price)}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min="0"
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
                  <td className="p-3">
                    <button
                      onClick={() => toggleActive(product)}
                      disabled={busyId === product._id}
                      className={`px-2 py-1 rounded text-xs disabled:opacity-40 ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}
                    >
                      {product.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(product)} className="text-amber-700 hover:text-amber-900">Edit</button>
                      <button onClick={() => remove(product)} className="text-red-600 hover:text-red-800">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={page} pages={pages} onChange={setPage} />
    </AdminShell>
  );
}

export default AdminProducts;
