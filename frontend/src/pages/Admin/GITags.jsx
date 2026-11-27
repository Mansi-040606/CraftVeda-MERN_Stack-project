import { useCallback, useEffect, useState } from 'react';
import adminApi from '../../services/adminApi';
import { toast, errMsg } from '../../components/Toast';
import { AdminShell, Loading, ErrorState, EmptyState, Pager } from '../../components/admin/AdminShell';

const emptyForm = {
  name: '',
  type: '',
  description: '',
  state: '',
  district: '',
  region: '',
  products: '',
  history: '',
  significance: '',
  technique: '',
  wikipediaUrl: '',
  isActive: true,
};

function AdminGITags() {
  const [giTags, setGITags] = useState([]);
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      const res = await adminApi.giTags(params);
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
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (giTag) => {
    setBusyId(giTag._id);
    try {
      await adminApi.patchGITag(giTag._id, { isActive: !giTag.isActive });
      toast.success(giTag.isActive ? 'GI tag deactivated' : 'GI tag activated');
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to update GI tag'));
    } finally {
      setBusyId(null);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (giTag) => {
    setEditing(giTag);
    setForm({
      name: giTag.name || '',
      type: giTag.type || '',
      description: giTag.description || '',
      state: giTag.location?.state || '',
      district: giTag.location?.district || '',
      region: giTag.location?.region || '',
      products: (giTag.products || []).join(', '),
      history: giTag.history || '',
      significance: giTag.significance || '',
      technique: giTag.technique || '',
      wikipediaUrl: giTag.wikipediaUrl || '',
      isActive: giTag.isActive !== false,
    });
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.type.trim() || !form.description.trim() || !form.state.trim()) {
      toast.error('Name, type, description, and state are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type.trim(),
        description: form.description.trim(),
        location: {
          state: form.state.trim(),
          district: form.district.trim() || undefined,
          region: form.region.trim() || undefined,
        },
        products: form.products.split(',').map((p) => p.trim()).filter(Boolean),
        history: form.history.trim() || undefined,
        significance: form.significance.trim() || undefined,
        technique: form.technique.trim() || undefined,
        wikipediaUrl: form.wikipediaUrl.trim() || undefined,
        isActive: Boolean(form.isActive),
      };

      if (editing) {
        await adminApi.updateGITag(editing._id, payload);
        toast.success('GI tag updated');
      } else {
        await adminApi.createGITag(payload);
        toast.success('GI tag created');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to save GI tag'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell title="GI Tags">
      <div className="bg-white rounded-sm border border-ink/10 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Search name, type or state"
          className="border border-ink/10 rounded-sm px-3 py-2 text-sm flex-1 min-w-48"
        />
        <button onClick={load} className="px-4 py-2 bg-parchment text-ink-soft rounded-sm text-sm">
          Search
        </button>
        <span className="text-sm text-ink-soft">{total} GI tags</span>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-terracotta text-white rounded-sm text-sm font-medium hover:bg-terracotta-dark transition"
        >
          Add GI Tag
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="bg-white rounded-sm border border-ink/10 p-6 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <h2 className="font-bold text-ink md:col-span-2">
            {editing ? 'Edit GI Tag' : 'Add GI Tag'}
          </h2>

          <label className="text-sm text-ink-soft">
            Name *
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Banarasi Brocades and Sarees"
              className="mt-1 w-full border border-ink/10 rounded-sm px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="text-sm text-ink-soft">
            Craft Type *
            <input
              required
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              placeholder="e.g. Textiles"
              className="mt-1 w-full border border-ink/10 rounded-sm px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="text-sm text-ink-soft">
            State *
            <input
              required
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              placeholder="e.g. Uttar Pradesh"
              className="mt-1 w-full border border-ink/10 rounded-sm px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="text-sm text-ink-soft">
            District / Region
            <div className="flex gap-2 mt-1">
              <input
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                placeholder="District"
                className="w-1/2 border border-ink/10 rounded-sm px-3 py-2 text-sm text-ink"
              />
              <input
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder="Region"
                className="w-1/2 border border-ink/10 rounded-sm px-3 py-2 text-sm text-ink"
              />
            </div>
          </label>

          <label className="text-sm text-ink-soft md:col-span-2">
            Description *
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full border border-ink/10 rounded-sm px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="text-sm text-ink-soft">
            Associated Products (comma separated)
            <input
              value={form.products}
              onChange={(e) => setForm({ ...form, products: e.target.value })}
              placeholder="Silk sarees, brocade fabrics"
              className="mt-1 w-full border border-ink/10 rounded-sm px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="text-sm text-ink-soft">
            Wikipedia URL
            <input
              value={form.wikipediaUrl}
              onChange={(e) => setForm({ ...form, wikipediaUrl: e.target.value })}
              placeholder="https://en.wikipedia.org/..."
              className="mt-1 w-full border border-ink/10 rounded-sm px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="text-sm text-ink-soft">
            History
            <textarea
              rows={2}
              value={form.history}
              onChange={(e) => setForm({ ...form, history: e.target.value })}
              className="mt-1 w-full border border-ink/10 rounded-sm px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="text-sm text-ink-soft">
            Technique &amp; Significance
            <textarea
              rows={2}
              value={form.technique}
              onChange={(e) => setForm({ ...form, technique: e.target.value })}
              className="mt-1 w-full border border-ink/10 rounded-sm px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-ink md:col-span-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active in GI Tag directory
          </label>

          <div className="md:col-span-2 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-terracotta text-white rounded-sm text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create GI Tag'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2 bg-parchment text-ink-soft rounded-sm text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && <Loading />}
      {!loading && error && <ErrorState message={error} />}
      {!loading && !error && giTags.length === 0 && <EmptyState message="No GI tags found" />}

      {!loading && !error && giTags.length > 0 && (
        <div className="bg-white rounded-sm border border-ink/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-soft border-b border-ink/10">
                <th className="p-3">Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">State</th>
                <th className="p-3">Products</th>
                <th className="p-3">Active</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {giTags.map((giTag) => (
                <tr key={giTag._id} className="border-b border-ink/5">
                  <td className="p-3 font-medium text-ink">{giTag.name}</td>
                  <td className="p-3 text-terracotta-dark">{giTag.type}</td>
                  <td className="p-3 text-terracotta-dark">{giTag.location?.state}</td>
                  <td className="p-3 text-terracotta-dark">{(giTag.products || []).length}</td>
                  <td className="p-3">
                    <button
                      onClick={() => toggle(giTag)}
                      disabled={busyId === giTag._id}
                      className={`px-2 py-1 rounded text-xs disabled:opacity-40 ${giTag.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}
                    >
                      {giTag.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => openEdit(giTag)}
                      className="text-terracotta-dark hover:underline"
                    >
                      Edit
                    </button>
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

export default AdminGITags;
