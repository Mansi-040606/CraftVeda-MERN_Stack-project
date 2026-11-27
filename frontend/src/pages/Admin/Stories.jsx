import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import { toast, errMsg } from '../../components/Toast';
import { AdminShell, Loading, ErrorState, EmptyState, Pager } from '../../components/admin/AdminShell';

const CATEGORIES = ['history', 'technique', 'artisan-story', 'heritage', 'preservation', 'other'];

const emptyForm = {
  title: '',
  slug: '',
  category: 'heritage',
  craftType: '',
  region: '',
  readTime: 4,
  coverImage: '',
  excerpt: '',
  content: '',
  tags: '',
  featured: false,
};

function AdminStories() {
  const [stories, setStories] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10 };
      if (category) params.category = category;
      const res = await adminApi.stories(params);
      setStories(res.data.stories || []);
      setPages(res.data.pages || 0);
      setTotal(res.data.total || 0);
    } catch (err) {
      const message = errMsg(err, 'Failed to load craft stories');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, category]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (story) => {
    setEditing(story);
    setForm({
      title: story.title || '',
      slug: story.slug || '',
      category: story.category || 'heritage',
      craftType: story.craftType || '',
      region: story.region || '',
      readTime: story.readTime || 4,
      coverImage: story.coverImage || '',
      excerpt: story.excerpt || '',
      content: story.content || '',
      tags: (story.tags || []).join(', '),
      featured: Boolean(story.featured),
    });
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        craftType: form.craftType.trim() || undefined,
        region: form.region.trim() || undefined,
        readTime: Number(form.readTime) || undefined,
        coverImage: form.coverImage.trim() || undefined,
        excerpt: form.excerpt.trim() || undefined,
        content: form.content.trim(),
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        featured: Boolean(form.featured),
      };
      if (form.slug.trim()) payload.slug = form.slug.trim();

      if (editing) {
        await adminApi.updateStory(editing._id, payload);
        toast.success('Story updated');
      } else {
        await adminApi.createStory(payload);
        toast.success('Story published');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to save story'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (story) => {
    if (!window.confirm(`Delete "${story.title}"? This cannot be undone.`)) return;
    setBusyId(story._id);
    try {
      await adminApi.deleteStory(story._id);
      toast.success('Story deleted');
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to delete story'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell title="Craft Stories">
      <div className="bg-white rounded-sm border border-ink/10 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="border border-ink/10 rounded-sm px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button onClick={load} className="px-4 py-2 bg-parchment text-ink-soft rounded-sm text-sm">
          Refresh
        </button>
        <span className="text-sm text-ink-soft flex-1">{total} stories</span>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-terracotta text-white rounded-sm text-sm font-medium hover:bg-terracotta-dark transition"
        >
          Add Story
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="bg-white rounded-sm border border-ink/10 p-6 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <h2 className="font-bold text-ink md:col-span-2">
            {editing ? 'Edit Craft Story' : 'New Craft Story'}
          </h2>

          <label className="text-sm text-ink-soft">
            Title *
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full border border-ink/10 rounded-sm px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="text-sm text-ink-soft">
            Slug (auto-generated if blank)
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="e.g. jaipur-blue-pottery-revival"
              className="mt-1 w-full border border-ink/10 rounded-sm px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="text-sm text-ink-soft">
            Category
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="mt-1 w-full border border-ink/10 rounded-sm px-3 py-2 text-sm text-ink"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-ink-soft">
            Craft Type
            <input
              value={form.craftType}
              onChange={(e) => setForm({ ...form, craftType: e.target.value })}
              placeholder="e.g. Blue Pottery"
              className="mt-1 w-full border border-ink/10 rounded-sm px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="text-sm text-ink-soft">
            Region
            <input
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              placeholder="e.g. Jaipur, Rajasthan"
              className="mt-1 w-full border border-ink/10 rounded-sm px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="text-sm text-ink-soft">
            Read Time (minutes)
            <input
              type="number"
              min="1"
              value={form.readTime}
              onChange={(e) => setForm({ ...form, readTime: e.target.value })}
              className="mt-1 w-full border border-ink/10 rounded-sm px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="text-sm text-ink-soft">
            Cover Image URL
            <input
              value={form.coverImage}
              onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
              placeholder="https://..."
              className="mt-1 w-full border border-ink/10 rounded-sm px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="text-sm text-ink-soft">
            Tags (comma separated)
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="heritage, pottery, rajasthan"
              className="mt-1 w-full border border-ink/10 rounded-sm px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="text-sm text-ink-soft md:col-span-2">
            Excerpt (max 300 chars)
            <input
              maxLength={300}
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              className="mt-1 w-full border border-ink/10 rounded-sm px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="text-sm text-ink-soft md:col-span-2">
            Content *
            <textarea
              required
              rows={6}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="mt-1 w-full border border-ink/10 rounded-sm px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-ink md:col-span-2">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            />
            Featured story on home page
          </label>

          <div className="md:col-span-2 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-terracotta text-white rounded-sm text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Publish Story'}
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
      {!loading && !error && stories.length === 0 && <EmptyState message="No stories found" />}

      {!loading && !error && stories.length > 0 && (
        <div className="bg-white rounded-sm border border-ink/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-soft border-b border-ink/10">
                <th className="p-3">Title</th>
                <th className="p-3">Category</th>
                <th className="p-3">Region / Craft</th>
                <th className="p-3">Featured</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stories.map((story) => (
                <tr key={story._id} className="border-b border-ink/5">
                  <td className="p-3">
                    <Link
                      to={`/stories/${story.slug}`}
                      className="font-medium text-ink hover:text-terracotta-dark"
                    >
                      {story.title}
                    </Link>
                    <span className="block text-xs text-ink-faint font-mono">{story.slug}</span>
                  </td>
                  <td className="p-3 text-terracotta-dark">{story.category}</td>
                  <td className="p-3 text-ink-soft">
                    {[story.region, story.craftType].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        story.featured ? 'bg-green-100 text-green-800' : 'bg-parchment text-ink-soft'
                      }`}
                    >
                      {story.featured ? 'Featured' : 'Standard'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => openEdit(story)}
                        className="text-terracotta-dark hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(story)}
                        disabled={busyId === story._id}
                        className="text-red-600 hover:underline disabled:opacity-40"
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
    </AdminShell>
  );
}

export default AdminStories;
