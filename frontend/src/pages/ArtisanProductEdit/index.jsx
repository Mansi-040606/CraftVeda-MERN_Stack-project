import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ArtisanShell from '../../components/artisan/ArtisanShell';
import { Loading, ErrorState } from '../../components/admin/AdminShell';
import { toast, errMsg } from '../../components/Toast';
import { productService } from '../../services/productService';
import { giTagService } from '../../services/giTagService';
import ImageManager from '../../components/product/ImageManager';

const CATEGORIES = ['textiles', 'pottery', 'jewelry', 'woodwork', 'metalwork', 'painting', 'sculpture', 'embroidery', 'other'];

const inputCls =
  'mt-1 w-full rounded-sm border border-ink/15 px-3 py-2 text-sm text-ink focus:border-terracotta focus:outline-none';
const labelCls = 'text-sm text-ink-soft';
const cardCls = 'rounded-sm border border-ink/10 bg-white p-6';
const headingCls = 'font-display text-lg font-semibold text-ink';

const secondaryBtn =
  'rounded-sm border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-parchment disabled:opacity-50';
const primaryBtn =
  'rounded-sm bg-terracotta px-4 py-2 text-sm font-semibold text-white transition hover:bg-terracotta-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta disabled:opacity-50';
const dangerBtn =
  'rounded-sm border border-clay-red/40 bg-white px-3 py-2 text-sm font-medium text-clay-red transition hover:bg-clay-red hover:text-white disabled:opacity-50';

// ---------- form helpers ----------
const parseList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const numOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

// The product document -> editable form. Every value becomes a string so that
// typing the same digits back does not count as a change.
const toForm = (product) => ({
  name: product.name ?? '',
  description: product.description ?? '',
  price: product.price === undefined || product.price === null ? '' : String(product.price),
  category: product.category || 'textiles',
  craftType: product.craftType ?? '',
  material: product.material ?? '',
  weight: product.weight === undefined || product.weight === null ? '' : String(product.weight),
  colorText: (product.color || []).join(', '),
  stock: product.stock === undefined || product.stock === null ? '' : String(product.stock),
  tagsText: (product.tags || []).join(', '),
  isCustomizable: Boolean(product.isCustomizable),
  customizationOptions: (product.customizationOptions || []).map((option) => ({
    name: option.name || '',
    optionsText: (option.options || []).join(', '),
    additionalPrice:
      option.additionalPrice === undefined || option.additionalPrice === null
        ? ''
        : String(option.additionalPrice),
  })),
  giTag: product.giTag?._id || (typeof product.giTag === 'string' ? product.giTag : ''),
  dimensions: {
    length: product.dimensions?.length ?? '',
    width: product.dimensions?.width ?? '',
    height: product.dimensions?.height ?? '',
    unit: product.dimensions?.unit || 'cm',
  },
});

// Mirrors the backend product validators, plus a few "is this listing good?"
// rules used by the quality checklist.
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

// Everything the PUT /products/:id endpoint accepts. `images` is deliberately
// absent — image changes go through the dedicated image endpoints.
const buildPayload = (form) => ({
  name: form.name.trim(),
  description: form.description.trim(),
  price: Number(form.price),
  category: form.category,
  craftType: form.craftType.trim(),
  material: form.material.trim() || null,
  stock: Number(form.stock),
  color: parseList(form.colorText),
  tags: parseList(form.tagsText),
  isCustomizable: form.isCustomizable,
  giTag: form.giTag || null,
  weight: numOrNull(form.weight),
  dimensions: {
    length: numOrNull(form.dimensions.length),
    width: numOrNull(form.dimensions.width),
    height: numOrNull(form.dimensions.height),
    unit: form.dimensions.unit || 'cm',
  },
  customizationOptions: form.isCustomizable
    ? form.customizationOptions.map((option) => ({
        name: option.name.trim(),
        options: parseList(option.optionsText),
        additionalPrice: numOrNull(option.additionalPrice) ?? 0,
      }))
    : [],
});

const loadChecks = (form, imageCount) => [
  { label: 'Name added', ok: form.name.trim().length >= 2 },
  { label: 'Description of at least 60 characters', ok: form.description.trim().length >= 60 },
  { label: 'Price above ₹0', ok: Number(form.price) > 0 },
  {
    label: 'Category and craft type chosen',
    ok: CATEGORIES.includes(form.category) && form.craftType.trim().length > 0,
  },
  { label: 'At least one photo', ok: imageCount > 0 },
  { label: 'Stock of 1 or more', ok: Number(form.stock) >= 1 },
  {
    label: 'Material or measurements added',
    ok:
      form.material.trim().length > 0 ||
      form.dimensions.length !== '' ||
      form.dimensions.width !== '' ||
      form.dimensions.height !== '' ||
      form.weight !== '',
  },
  { label: 'At least one tag', ok: parseList(form.tagsText).length > 0 },
];

function ArtisanProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [product, setProduct] = useState(null);
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState('');
  const [pendingFiles, setPendingFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [giTags, setGiTags] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await productService.getMineById(id);
      const loaded = res.data.product;
      setProduct(loaded);
      const next = toForm(loaded);
      setForm(next);
      setBaseline(JSON.stringify(next));
      setPendingFiles([]);
    } catch (err) {
      const status = err.response?.status;
      const message =
        status === 404
          ? 'This product does not exist.'
          : status === 403
            ? 'You can only manage your own products.'
            : errMsg(err, 'Failed to load this product');
      setLoadError({ status, message });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    giTagService
      .getAll({ limit: 100 })
      .then((res) => setGiTags(res.data.giTags || []))
      .catch(() => setGiTags([]));
  }, []);

  const images = product?.images || [];
  const dirty = useMemo(
    () => (form ? JSON.stringify(form) !== baseline : false) || pendingFiles.length > 0,
    [form, baseline, pendingFiles],
  );

  // Unsaved-changes guard: native prompt on tab close / refresh, and a confirm
  // on any in-app link the user clicks while dirty.
  useEffect(() => {
    if (!dirty) return undefined;

    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    const onClickCapture = (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target?.closest?.('a[href]');
      if (!anchor) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      if (anchor.origin !== window.location.origin) return;
      if (
        anchor.pathname === window.location.pathname &&
        anchor.search === window.location.search &&
        anchor.hash
      ) {
        return; // same-page anchor
      }
      if (!window.confirm('You have unsaved changes. Leave this page without saving?')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClickCapture, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClickCapture, true);
    };
  }, [dirty]);

  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  const setDimension = (key, value) =>
    setForm((current) => ({ ...current, dimensions: { ...current.dimensions, [key]: value } }));

  const setOption = (index, patch) =>
    setForm((current) => ({
      ...current,
      customizationOptions: current.customizationOptions.map((option, i) =>
        i === index ? { ...option, ...patch } : option,
      ),
    }));

  const save = async (event) => {
    event?.preventDefault();
    if (!form) return;
    const problem = validateForm(form);
    if (problem) {
      toast.error(problem);
      return;
    }

    setSaving(true);
    try {
      const res = await productService.update(id, buildPayload(form));
      setProduct(res.data.product);
      setBaseline(JSON.stringify(form));
      toast.success('Changes saved');

      if (pendingFiles.length) {
        try {
          const upload = await productService.uploadImages(id, pendingFiles);
          setProduct(upload.data.product);
          setPendingFiles([]);
          toast.success(
            pendingFiles.length === 1 ? 'Photo uploaded' : `${pendingFiles.length} photos uploaded`,
          );
        } catch (err) {
          toast.error(errMsg(err, 'Details saved, but the photos failed to upload'));
        }
      }
    } catch (err) {
      toast.error(errMsg(err, 'Failed to save changes'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!product) return;
    setActionBusy(true);
    try {
      const res = await productService.patch(id, { isActive: !product.isActive });
      setProduct(res.data.product);
      toast.success(res.data.product.isActive ? 'Product is now visible in the shop' : 'Product hidden from the shop');
    } catch (err) {
      toast.error(errMsg(err, 'Failed to update visibility'));
    } finally {
      setActionBusy(false);
    }
  };

  const duplicate = async () => {
    if (dirty && !window.confirm('You have unsaved changes that will not be copied. Duplicate anyway?')) {
      return;
    }
    setActionBusy(true);
    try {
      const res = await productService.duplicate(id);
      const copyId = res.data.product?._id;
      toast.success('Copy created — it starts hidden');
      if (copyId) navigate(`/artisan/products/${copyId}/edit`);
    } catch (err) {
      toast.error(errMsg(err, 'Failed to duplicate this product'));
    } finally {
      setActionBusy(false);
    }
  };

  const remove = async () => {
    if (!product) return;
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setActionBusy(true);
    try {
      await productService.delete(id);
      toast.success('Product deleted');
      navigate('/artisan/products');
    } catch (err) {
      toast.error(errMsg(err, 'Failed to delete this product'));
      setActionBusy(false);
    }
  };

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <Link to="/artisan/products" className={secondaryBtn}>
        Back
      </Link>
      <button
        type="button"
        onClick={() => window.open(`/product/${id}`, '_blank', 'noopener')}
        disabled={!product}
        className={secondaryBtn}
      >
        Preview
      </button>
      <button type="button" onClick={toggleActive} disabled={!product || actionBusy} className={secondaryBtn}>
        {product?.isActive ? 'Hide' : 'Show'}
      </button>
      <button type="button" onClick={duplicate} disabled={!product || actionBusy} className={secondaryBtn}>
        Duplicate
      </button>
      <button type="button" onClick={remove} disabled={!product || actionBusy} className={dangerBtn}>
        Delete
      </button>
      <button type="button" onClick={save} disabled={!dirty || saving} className={primaryBtn}>
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );

  if (loading) {
    return (
      <ArtisanShell title="Edit Product" actions={actions}>
        <Loading />
      </ArtisanShell>
    );
  }

  if (loadError || !product || !form) {
    return (
      <ArtisanShell title="Edit Product" actions={actions}>
        <div className={cardCls}>
          <ErrorState message={loadError?.message || 'Failed to load this product'} />
          <div className="mt-4 text-center">
            <Link to="/artisan/products" className={primaryBtn}>
              Back to My Products
            </Link>
          </div>
        </div>
      </ArtisanShell>
    );
  }

  const checks = loadChecks(form, images.length);
  const done = checks.filter((check) => check.ok).length;
  const allGood = done === checks.length;

  return (
    <ArtisanShell title="Edit Product" actions={actions}>
      <p className="mb-4 text-sm text-ink-soft">
        Editing <span className="font-medium text-ink">{product.name}</span>
        {product.createdAt && (
          <>
            {' · listed '}
            {new Date(product.createdAt).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </>
        )}
        {dirty && (
          <span className="ml-2 rounded-sm bg-saffron/25 px-2 py-0.5 text-xs font-semibold text-saffron-dark">
            Unsaved changes
          </span>
        )}
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <form onSubmit={save} className="space-y-4">
            <section className={cardCls}>
              <h2 className={`${headingCls} mb-4`}>The basics</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className={labelCls}>
                  Name *
                  <input
                    required
                    minLength={2}
                    value={form.name}
                    onChange={(e) => set({ name: e.target.value })}
                    className={inputCls}
                  />
                </label>

                <label className={labelCls}>
                  Price (₹) *
                  <input
                    required
                    type="number"
                    min="1"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => set({ price: e.target.value })}
                    className={inputCls}
                  />
                </label>

                <label className={`${labelCls} md:col-span-2`}>
                  Description *
                  <textarea
                    required
                    rows={5}
                    value={form.description}
                    onChange={(e) => set({ description: e.target.value })}
                    className={inputCls}
                  />
                </label>

                <label className={labelCls}>
                  Category *
                  <select
                    value={form.category}
                    onChange={(e) => set({ category: e.target.value })}
                    className={inputCls}
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={labelCls}>
                  Craft type *
                  <input
                    required
                    placeholder="e.g. Block Printing"
                    value={form.craftType}
                    onChange={(e) => set({ craftType: e.target.value })}
                    className={inputCls}
                  />
                </label>

                <label className={labelCls}>
                  Stock *
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={(e) => set({ stock: e.target.value })}
                    className={inputCls}
                  />
                </label>

                <div className="flex items-end gap-2">
                  <span
                    className={`rounded-sm px-2 py-1 text-xs font-semibold ${
                      product.isActive ? 'bg-moss-soft text-moss' : 'bg-clay-red-soft text-clay-red'
                    }`}
                  >
                    {product.isActive ? 'Visible in the shop' : 'Hidden from the shop'}
                  </span>
                </div>
              </div>
            </section>

            <section className={cardCls}>
              <h2 className={`${headingCls} mb-1`}>Photos</h2>
              <p className="mb-4 text-xs text-ink-faint">
                New photos upload when you press Save Changes. Drag to reorder — the first one is the cover.
              </p>
              <ImageManager
                productId={id}
                images={images}
                onImagesChange={(next) => setProduct((current) => ({ ...current, images: next }))}
                files={pendingFiles}
                onFilesChange={setPendingFiles}
              />
            </section>

            <section className={cardCls}>
              <h2 className={`${headingCls} mb-4`}>Details</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className={labelCls}>
                  Material
                  <input
                    placeholder="e.g. Pure cotton"
                    value={form.material}
                    onChange={(e) => set({ material: e.target.value })}
                    className={inputCls}
                  />
                </label>

                <label className={labelCls}>
                  Colour
                  <input
                    placeholder="Indigo, madder red (comma separated)"
                    value={form.colorText}
                    onChange={(e) => set({ colorText: e.target.value })}
                    className={inputCls}
                  />
                </label>

                <label className={labelCls}>
                  Weight (g)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.weight}
                    onChange={(e) => set({ weight: e.target.value })}
                    className={inputCls}
                  />
                </label>

                <label className={labelCls}>
                  GI tag
                  <select value={form.giTag} onChange={(e) => set({ giTag: e.target.value })} className={inputCls}>
                    <option value="">None</option>
                    {giTags.map((tag) => (
                      <option key={tag._id} value={tag._id}>
                        {tag.name}
                      </option>
                    ))}
                    {form.giTag && !giTags.some((tag) => tag._id === form.giTag) && (
                      <option value={form.giTag}>Currently linked tag</option>
                    )}
                  </select>
                </label>

                <div className="md:col-span-2">
                  <p className="text-sm text-ink-soft">Dimensions</p>
                  <div className="mt-1 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <label className="text-xs text-ink-faint">
                      Length
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.dimensions.length}
                        onChange={(e) => setDimension('length', e.target.value)}
                        className={inputCls}
                      />
                    </label>
                    <label className="text-xs text-ink-faint">
                      Width
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.dimensions.width}
                        onChange={(e) => setDimension('width', e.target.value)}
                        className={inputCls}
                      />
                    </label>
                    <label className="text-xs text-ink-faint">
                      Height
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.dimensions.height}
                        onChange={(e) => setDimension('height', e.target.value)}
                        className={inputCls}
                      />
                    </label>
                    <label className="text-xs text-ink-faint">
                      Unit
                      <select
                        value={form.dimensions.unit}
                        onChange={(e) => setDimension('unit', e.target.value)}
                        className={inputCls}
                      >
                        <option value="cm">cm</option>
                        <option value="in">in</option>
                        <option value="mm">mm</option>
                      </select>
                    </label>
                  </div>
                </div>

                <label className={`${labelCls} md:col-span-2`}>
                  Tags
                  <input
                    placeholder="handloom, natural dye, wedding (comma separated)"
                    value={form.tagsText}
                    onChange={(e) => set({ tagsText: e.target.value })}
                    className={inputCls}
                  />
                </label>
              </div>
            </section>

            <section className={cardCls}>
              <div className="flex items-center justify-between gap-3">
                <h2 className={headingCls}>Customisation</h2>
                <label className="flex items-center gap-2 text-sm text-ink-soft">
                  <input
                    type="checkbox"
                    checked={form.isCustomizable}
                    onChange={(e) => set({ isCustomizable: e.target.checked })}
                    className="accent-terracotta"
                  />
                  This piece can be customised
                </label>
              </div>

              {form.isCustomizable && (
                <div className="mt-4 space-y-3">
                  {form.customizationOptions.map((option, index) => (
                    <div
                      key={`${option.name}-${index}`}
                      className="grid grid-cols-1 gap-3 rounded-sm border border-ink/10 bg-parchment/50 p-3 md:grid-cols-[1fr_2fr_1fr_auto]"
                    >
                      <input
                        placeholder="Option name (e.g. Size)"
                        value={option.name}
                        onChange={(e) => setOption(index, { name: e.target.value })}
                        className={inputCls}
                      />
                      <input
                        placeholder="Choices (comma separated)"
                        value={option.optionsText}
                        onChange={(e) => setOption(index, { optionsText: e.target.value })}
                        className={inputCls}
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Extra ₹"
                        value={option.additionalPrice}
                        onChange={(e) => setOption(index, { additionalPrice: e.target.value })}
                        className={inputCls}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          set({
                            customizationOptions: form.customizationOptions.filter((_, i) => i !== index),
                          })
                        }
                        className="rounded-sm px-3 py-2 text-sm text-clay-red hover:bg-clay-red-soft"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      set({
                        customizationOptions: [
                          ...form.customizationOptions,
                          { name: '', optionsText: '', additionalPrice: '' },
                        ],
                      })
                    }
                    className="rounded-sm border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-parchment"
                  >
                    Add customisation
                  </button>
                </div>
              )}
            </section>

            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={!dirty || saving} className={primaryBtn}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <Link to="/artisan/products" className={secondaryBtn}>
                Back to My Products
              </Link>
            </div>
          </form>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <section className={cardCls}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-ink">Listing quality</span>
              <span className="text-xs text-ink-faint">
                {done} of {checks.length}
              </span>
            </div>
            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-linen">
              <div
                className={`h-full rounded-full transition-all ${allGood ? 'bg-moss' : 'bg-terracotta'}`}
                style={{ width: `${Math.round((done / checks.length) * 100)}%` }}
              />
            </div>
            <ul className="divide-y divide-ink/5">
              {checks.map((check) => (
                <li key={check.label} className="flex items-start gap-2 py-2 text-sm">
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      check.ok ? 'bg-moss text-white' : 'bg-linen text-ink-faint'
                    }`}
                    aria-hidden="true"
                  >
                    {check.ok ? '✓' : '×'}
                  </span>
                  <span className={check.ok ? 'text-ink' : 'text-ink-soft'}>{check.label}</span>
                </li>
              ))}
            </ul>
            <p className={`mt-3 text-xs ${allGood ? 'font-semibold text-moss' : 'text-ink-faint'}`}>
              {allGood
                ? 'Everything is filled in — this listing is ready for the shop.'
                : 'Finish the items above to make this listing easier to find.'}
            </p>
          </section>

          <section className={cardCls}>
            <h2 className={`${headingCls} mb-3`}>Visibility</h2>
            <p className="mb-3 text-sm text-ink-soft">
              {product.isActive
                ? 'This product is shown in the shop and can be found in search.'
                : 'This product is hidden — only you can see it, under My Products.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={toggleActive} disabled={actionBusy} className={secondaryBtn}>
                {product.isActive ? 'Hide from shop' : 'Show in shop'}
              </button>
              <button
                type="button"
                onClick={() => window.open(`/product/${id}`, '_blank', 'noopener')}
                className={secondaryBtn}
              >
                Preview
              </button>
            </div>
          </section>
        </aside>
      </div>
    </ArtisanShell>
  );
}

export default ArtisanProductEdit;
