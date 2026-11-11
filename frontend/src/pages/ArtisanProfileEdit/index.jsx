import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ArtisanShell from '../../components/artisan/ArtisanShell';
import { Loading, ErrorState } from '../../components/admin/AdminShell';
import { toast, errMsg } from '../../components/Toast';
import { artisanService } from '../../services/artisanService';

const emptyForm = {
  businessName: '',
  description: '',
  story: '',
  craftTypes: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  instagram: '',
  facebook: '',
  website: '',
  profileImage: '',
};

// Client-side validation that mirrors what the model requires.
const validateForm = (form) => {
  if (form.businessName.trim().length < 2) return 'Business name must be at least 2 characters';
  if (!form.description.trim()) return 'Description is required';
  if (form.craftTypes.split(',').map((c) => c.trim()).filter(Boolean).length === 0) {
    return 'At least one craft type is required';
  }
  return null;
};

// The location subdocument keeps its geo fields — only address parts are edited here.
const buildPayload = (form, artisan) => ({
  businessName: form.businessName.trim(),
  description: form.description.trim(),
  story: form.story.trim(),
  craftTypes: form.craftTypes.split(',').map((c) => c.trim()).filter(Boolean),
  location: {
    type: artisan.location?.type || 'Point',
    coordinates: artisan.location?.coordinates || [0, 0],
    address: form.address.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    pincode: form.pincode.trim(),
  },
  socialLinks: {
    instagram: form.instagram.trim(),
    facebook: form.facebook.trim(),
    website: form.website.trim(),
  },
  profileImage: form.profileImage.trim(),
});

function ArtisanProfileEdit() {
  const [artisan, setArtisan] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await artisanService.getMy();
      const a = res.data.artisan;
      setArtisan(a);
      setForm({
        businessName: a.businessName || '',
        description: a.description || '',
        story: a.story || '',
        craftTypes: (a.craftTypes || []).join(', '),
        address: a.location?.address || '',
        city: a.location?.city || '',
        state: a.location?.state || '',
        pincode: a.location?.pincode || '',
        instagram: a.socialLinks?.instagram || '',
        facebook: a.socialLinks?.facebook || '',
        website: a.socialLinks?.website || '',
        profileImage: a.profileImage || '',
      });
    } catch (err) {
      const message = errMsg(err, 'Failed to load your profile');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e) => {
    e.preventDefault();
    const problem = validateForm(form);
    if (problem) {
      toast.error(problem);
      return;
    }

    setSaving(true);
    try {
      // Existing own-profile PUT route (owner-only, enforced server-side).
      await artisanService.update(artisan._id, buildPayload(form, artisan));
      toast.success('Profile updated');
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to save profile'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ArtisanShell title="My Profile">
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

      {!loading && !error && artisan && (
        <form onSubmit={save} className="bg-white rounded-xl shadow-md p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
          <h2 className="font-bold text-amber-900 md:col-span-2">Edit Business Profile</h2>

          <label className="text-sm text-amber-800">
            Business name *
            <input
              required
              minLength={2}
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-amber-800">
            Craft types * <span className="text-amber-500">(comma-separated)</span>
            <input
              required
              placeholder="textiles, embroidery"
              value={form.craftTypes}
              onChange={(e) => setForm({ ...form, craftTypes: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-amber-800 md:col-span-2">
            Description *
            <textarea
              required
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-amber-800 md:col-span-2">
            Story / bio
            <textarea
              rows={4}
              value={form.story}
              onChange={(e) => setForm({ ...form, story: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <h3 className="font-bold text-amber-900 md:col-span-2 mt-2">Location</h3>

          <label className="text-sm text-amber-800 md:col-span-2">
            Address
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-amber-800">
            City
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-amber-800">
            State
            <input
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-amber-800">
            Pincode
            <input
              value={form.pincode}
              onChange={(e) => setForm({ ...form, pincode: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <h3 className="font-bold text-amber-900 md:col-span-2 mt-2">Contact</h3>

          <label className="text-sm text-amber-800">
            Instagram
            <input
              placeholder="https://instagram.com/..."
              value={form.instagram}
              onChange={(e) => setForm({ ...form, instagram: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-amber-800">
            Facebook
            <input
              placeholder="https://facebook.com/..."
              value={form.facebook}
              onChange={(e) => setForm({ ...form, facebook: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-amber-800">
            Website
            <input
              placeholder="https://..."
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-amber-800">
            Profile image URL
            <input
              placeholder="https://..."
              value={form.profileImage}
              onChange={(e) => setForm({ ...form, profileImage: e.target.value })}
              className="mt-1 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <div className="flex gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              to={`/artisan/${artisan._id}`}
              className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm"
            >
              View Public Profile
            </Link>
          </div>
        </form>
      )}
    </ArtisanShell>
  );
}

export default ArtisanProfileEdit;
