import { useEffect, useState } from 'react';
import ProductImage from './ProductImage';

/* Small inline icons — the app has no icon library. */
function ChevronLeft({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
function ChevronRight({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
function ExpandIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}
function CloseIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

/**
 * Product image gallery: large frame + thumbnail strip + full-screen lightbox
 * with keyboard navigation (←/→) and Escape to close.
 */
export default function ProductGallery({ images = [], alt = '', priority = false }) {
  const list = images.filter(Boolean);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setIndex(0);
  }, [images]);

  useEffect(() => {
    if (index >= list.length) setIndex(0);
  }, [list.length, index]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
      else if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % list.length);
      else if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + list.length) % list.length);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, list.length]);

  const current = list[index];

  if (list.length === 0) {
    return <ProductImage src="" alt={alt} frame="aspect-square" priority={priority} />;
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* main frame */}
        <div className="group relative overflow-hidden rounded-sm border border-ink/10 bg-linen">
          <ProductImage
            src={current}
            alt={`${alt} — image ${index + 1}`}
            frame="aspect-square"
            w={1200}
            h={1200}
            priority={priority}
            imgClassName="cursor-zoom-in"
          />
          {/* clicking the frame opens the lightbox */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="absolute inset-0 cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-terracotta"
            aria-label={`Enlarge image ${index + 1}`}
          />
          <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-sm bg-ink/75 px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-cream opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <ExpandIcon /> View
          </span>
          <span className="pointer-events-none absolute left-3 top-3 rounded-sm bg-cream/90 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
            {index + 1} / {list.length}
          </span>
        </div>

        {/* thumbnails */}
        {list.length > 1 && (
          <ul className="no-scrollbar flex gap-2 overflow-x-auto pb-1" role="tablist"
              aria-label="Product images">
            {list.map((src, i) => (
              <li key={src} role="presentation">
                <button
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Show image ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-sm border transition ${
                    i === index
                      ? 'border-terracotta ring-2 ring-terracotta/35'
                      : 'border-ink/10 opacity-70 hover:opacity-100'
                  } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta`}
                >
                  <ProductImage src={src} alt="" frame="h-full w-full" w={160} h={160} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/92 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`${alt} image viewer`}
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close image viewer"
            className="absolute right-4 top-4 rounded-sm p-2 text-cream/85 transition hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-cream"
          >
            <CloseIcon className="h-6 w-6" />
          </button>

          <img
            src={current}
            alt={`${alt} — image ${index + 1} of ${list.length}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-sm object-contain shadow-2xl"
          />

          {list.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i - 1 + list.length) % list.length);
                }}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-cream/12 p-3 text-cream transition hover:bg-cream/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cream"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i + 1) % list.length);
                }}
                aria-label="Next image"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-cream/12 p-3 text-cream transition hover:bg-cream/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cream"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-sm text-cream/80">
                {index + 1} of {list.length} · ← → to navigate · Esc to close
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
