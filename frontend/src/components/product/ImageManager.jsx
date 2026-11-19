import { useEffect, useRef, useState } from 'react';
import { toast } from '../Toast';
import { productService } from '../../services/productService';
import ProductImage from './ProductImage';

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB, mirrors the backend
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPT_ATTR = 'image/jpeg,image/png,image/webp';

function bytesLabel(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Product image manager: shows the images already saved on the product
 * (drag to reorder, delete, first one is the cover) plus a drop zone for new
 * files that are uploaded when the artisan saves.
 *
 * Controlled: the parent owns `images` (urls) and `files` (pending File[]).
 */
export default function ImageManager({
  productId = null,
  images = [],
  onImagesChange,
  files = [],
  onFilesChange,
  max = 6,
}) {
  const [dragIndex, setDragIndex] = useState(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  const previewsRef = useRef(new Map());

  const remaining = max - images.length - files.length;

  useEffect(() => {
    const previews = previewsRef.current;
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
      previews.clear();
    };
  }, []);

  const previewOf = (file) => {
    if (!previewsRef.current.has(file)) {
      previewsRef.current.set(file, URL.createObjectURL(file));
    }
    return previewsRef.current.get(file);
  };

  const addFiles = (incoming) => {
    const accepted = [];
    for (const file of incoming) {
      if (files.length + images.length + accepted.length >= max) {
        toast.error(`A product can have at most ${max} images`);
        break;
      }
      if (!ACCEPTED.includes(file.type)) {
        toast.error(`"${file.name}" is not a JPG, PNG or WebP image`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`"${file.name}" is larger than 2 MB (${bytesLabel(file.size)})`);
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length) onFilesChange([...files, ...accepted]);
  };

  const dropPending = (index) => {
    const next = [...files];
    const [removed] = next.splice(index, 1);
    const preview = removed && previewsRef.current.get(removed);
    if (preview) {
      URL.revokeObjectURL(preview);
      previewsRef.current.delete(removed);
    }
    onFilesChange(next);
  };

  const removeSaved = async (url) => {
    if (!productId) {
      onImagesChange(images.filter((u) => u !== url));
      return;
    }
    setBusy(true);
    try {
      await productService.deleteImage(productId, url);
      onImagesChange(images.filter((u) => u !== url));
      toast.success('Image removed');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not remove the image');
    } finally {
      setBusy(false);
    }
  };

  const move = async (from, to) => {
    if (to < 0 || to >= images.length || from === to) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    // Optimistic, then confirm with the server.
    onImagesChange(next);
    if (!productId) return;
    setBusy(true);
    try {
      await productService.reorderImages(productId, next);
    } catch (err) {
      onImagesChange(images);
      toast.error(err?.response?.data?.message || 'Could not reorder the images');
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setOver(false);
    if (e.dataTransfer.files?.length) addFiles([...e.dataTransfer.files]);
  };

  const onDropReorder = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragIndex === null) return;
    move(dragIndex, index);
    setDragIndex(null);
  };

  const showDropzone = remaining > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink">Product images</span>
        <span className="text-xs text-ink-faint">
          {images.length + files.length} / {max} · first image is the cover
        </span>
      </div>

      {/* saved images */}
      {images.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {images.map((url, i) => (
            <li
              key={url}
              draggable={!busy}
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDropReorder(e, i)}
              onDragEnd={() => setDragIndex(null)}
              className={`group relative h-24 w-24 overflow-hidden rounded-sm border bg-linen ${
                dragIndex === i ? 'opacity-40' : 'border-ink/15'
              } ${i === 0 ? 'ring-2 ring-terracotta/45' : ''}`}
            >
              <ProductImage src={url} alt={`Image ${i + 1}`} frame="h-full w-full" w={240} h={240} />
              {i === 0 && (
                <span className="absolute bottom-0 left-0 right-0 bg-ink/75 py-0.5 text-center text-[9px] font-semibold uppercase tracking-[0.12em] text-cream">
                  Cover
                </span>
              )}
              <span
                className="absolute left-0.5 top-0.5 rounded-sm bg-cream/85 px-1 text-[9px] text-ink-soft opacity-0 transition group-hover:opacity-100"
                title="Drag to reorder"
              >
                ⇄
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => removeSaved(url)}
                aria-label={`Remove image ${i + 1}`}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/75 text-sm leading-none text-cream opacity-0 transition hover:bg-clay-red group-hover:opacity-100 disabled:opacity-40"
              >
                ×
              </button>
              <button
                type="button"
                disabled={busy || i === 0}
                onClick={() => move(i, 0)}
                aria-label={`Make image ${i + 1} the cover`}
                className="absolute bottom-1 right-1 rounded-sm bg-cream/85 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink-soft opacity-0 transition hover:bg-cream group-hover:opacity-100 disabled:hidden"
              >
                Make cover
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* pending files (uploaded on save) */}
      {files.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-saffron-dark">
            Ready to upload
          </p>
          <ul className="flex flex-wrap gap-3">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="group relative h-24 w-24 overflow-hidden rounded-sm border border-dashed border-saffron/70 bg-linen"
              >
                <img
                  src={previewOf(file)}
                  alt={file.name}
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 bg-ink/75 py-0.5 text-center text-[9px] text-cream">
                  {bytesLabel(file.size)}
                </span>
                <button
                  type="button"
                  onClick={() => dropPending(i)}
                  aria-label={`Remove ${file.name}`}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/75 text-sm leading-none text-cream opacity-0 transition hover:bg-clay-red group-hover:opacity-100"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* drop zone */}
      {showDropzone && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          className={`rounded-sm border-2 border-dashed px-4 py-6 text-center transition ${
            over
              ? 'border-terracotta bg-terracotta-soft'
              : 'border-ink/20 bg-parchment hover:border-terracotta/60'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) addFiles([...e.target.files]);
              e.target.value = '';
            }}
          />
          <p className="text-sm text-ink-soft">
            Drag photos here, or{' '}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="font-semibold text-terracotta-dark underline underline-offset-2 hover:text-ink"
            >
              browse your files
            </button>
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            JPG, PNG or WebP · max {MAX_BYTES / (1024 * 1024)} MB each · {remaining} slot
            {remaining === 1 ? '' : 's'} left
            {!productId && ' · uploaded when you create the product'}
          </p>
        </div>
      )}
    </div>
  );
}
