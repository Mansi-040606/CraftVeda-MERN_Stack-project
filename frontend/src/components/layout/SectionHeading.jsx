/**
 * Shared section heading for the storefront: small saffron eyebrow, serif
 * title, optional subtitle and a right-aligned "view all" link.
 */
export default function SectionHeading({ eyebrow, title, subtitle, action, center = false }) {
  return (
    <div
      className={`mb-8 flex flex-wrap items-end justify-between gap-4 ${
        center ? 'flex-col items-center text-center' : ''
      }`}
    >
      <div>
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-saffron-dark">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-1 font-display text-3xl font-semibold leading-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-1 max-w-xl text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
