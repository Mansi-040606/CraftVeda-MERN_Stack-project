import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ArtisanShell from '../../components/artisan/ArtisanShell';
import { Loading, ErrorState } from '../../components/admin/AdminShell';
import { toast, errMsg } from '../../components/Toast';
import { artisanService } from '../../services/artisanService';
import ProductImage from '../../components/product/ProductImage';
import UploadButton from '../../components/common/UploadButton';

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

const field =
  'mt-1 w-full rounded-sm border border-ink/15 px-3 py-2 text-sm text-ink focus:border-terracotta focus:outline-none';
const labelCls = 'text-sm text-ink-soft';

function ArtisanProfileEdit() {
  const [artisan, setArtisan] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null); // 'profile' | 'cover' | null

  const applyArtisan = useCallback((a) => {
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
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await artisanService.getMy();
      applyArtisan(res.data.artisan);
    } catch (err) {
      const message = errMsg(err, 'Failed to load your profile');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [applyArtisan]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async (kind, file) => {
    setUploading(kind);
    try {
      const res =
        kind === 'profile'
          ? await artisanService.uploadProfileImage(file)
          : await artisanService.uploadCoverImage(file);
      const updated = res.data.artisan;
      setArtisan(updated);
      setForm((f) => ({ ...f, profileImage: updated.profileImage || f.profileImage }));
      toast.success(kind === 'profile' ? 'Profile photo updated' : 'Cover photo updated');
    } catch (err) {
      toast.error(errMsg(err, 'Image upload failed'));
    } finally {
      setUploading(null);
    }
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
          <div className="mt-4 text-center">
            <button onClick={load} className="rounded-sm bg-terracotta px-4 py-2 text-sm font-semibold text-white">
              Retry
            </button>
          </div>
        </div>
      )}

      {!loading && !error && artisan && (
        <div className="max-w-3xl">
          {/* ----- photos ----- */}
          <section className="mb-4 rounded-sm border border-ink/10 bg-white p-6">
            <h2 className="font-display text-xl font-semibold text-ink">Photos</h2>
            <p className="mt-1 text-sm text-ink-soft">
              JPG, PNG or WebP up to 2 MB. The cover sits behind your studio name on your public
              profile; the portrait is your avatar across CraftVeda.
            </p>

            <div className="mt-5 grid gap-6 sm:grid-cols-[1fr_160px]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-saffron-dark">
                  Cover photo
                </p>
                <div className="mt-2 overflow-hidden rounded-sm border border-ink/10">
                  <ProductImage
                    src={artisan.coverImage}
                    alt="Cover photo"
                    frame="aspect-[3/1] w-full"
                    w={900}
                    h={300}
                  />
                </div>
                <div className="mt-2">
                  <UploadButton
                    label={artisan.coverImage ? 'Replace cover' : 'Upload cover'}
                    busy={uploading === 'cover'}
                    onFile={(file) => upload('cover', file)}
                    className="bg-parchment text-ink hover:bg-linen"
                  />
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-saffron-dark">
                  Portrait
                </p>
                <div className="mt-2 overflow-hidden rounded-full border border-ink/10">
                  <ProductImage
                    src={artisan.profileImage}
                    alt="Portrait"
                    frame="aspect-square w-full"
                    w={320}
                    h={320}
                  />
                </div>
                <div className="mt-2">
                  <UploadButton
                    label={artisan.profileImage ? 'Replace' : 'Upload'}
                    busy={uploading === 'profile'}
                    onFile={(file) => upload('profile', file)}
                    className="bg-parchment text-ink hover:bg-linen"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ----- details ----- */}
          <form onSubmit={save} className="grid max-w-3xl grid-cols-1 gap-4 rounded-sm border border-ink/10 bg-white p-6 md:grid-cols-2">
            <h2 className="font-display text-xl font-semibold text-ink md:col-span-2">
              Edit Business Profile
            </h2>

            <label className={labelCls}>
              Business name *
              <input
                required
                minLength={2}
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                className={field}
              />
            </label>

            <label className={labelCls}>
              Craft types * <span className="text-ink-faint">(comma-separated)</span>
              <input
                required
                placeholder="textiles, embroidery"
                value={form.craftTypes}
                onChange={(e) => setForm({ ...form, craftTypes: e.target.value })}
                className={field}
              />
            </label>

            <label className={`${labelCls} md:col-span-2`}>
              Description *
              <textarea
                required
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={field}
              />
            </label>

            <label className={`${labelCls} md:col-span-2`}>
              Story / bio
              <textarea
                rows={4}
                value={form.story}
                onChange={(e) => setForm({ ...form, story: e.target.value })}
                className={field}
              />
            </label>

            <h3 className="mt-2 font-display text-lg font-semibold text-ink md:col-span-2">Location</h3>

            <label className={`${labelCls} md:col-span-2`}>
              Address
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={field}
              />
            </label>

            <label className={labelCls}>
              City
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className={field}
              />
            </label>

            <label className={labelCls}>
              State
              <input
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className={field}
              />
            </label>

            <label className={labelCls}>
              Pincode
              <input
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                className={field}
              />
            </label>

            <h3 className="mt-2 font-display text-lg font-semibold text-ink md:col-span-2">Contact</h3>

            <label className={labelCls}>
              Instagram
              <input
                placeholder="https://instagram.com/..."
                value={form.instagram}
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                className={field}
              />
            </label>

            <label className={labelCls}>
              Facebook
              <input
                placeholder="https://facebook.com/..."
                value={form.facebook}
                onChange={(e) => setForm({ ...form, facebook: e.target.value })}
                className={field}
              />
            </label>

            <label className={`${labelCls} md:col-span-2`}>
              Website
              <input
                placeholder="https://..."
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className={field}
              />
            </label>

            <div className="flex gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-sm bg-terracotta px-4 py-2 text-sm font-semibold text-white transition hover:bg-terracotta-dark disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <Link
                to={`/artisan/${artisan._id}`}
                className="rounded-sm bg-parchment px-4 py-2 text-sm text-ink transition hover:bg-linen"
              >
                View Public Profile
              </Link>
            </div>
          </form>
        </div>
      )}
    </ArtisanShell>
  );
}

export default ArtisanProfileEdit;
