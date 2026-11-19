/**
 * "Craft heritage" panel — explains the Geographical Indication (GI) tag and
 * traditional technique behind a product when the API returns one.
 * Purely presentational; renders nothing when the product has no GI tag.
 */
export default function CraftHeritage({ giTag, craftType, material }) {
  const hasTag = Boolean(giTag && giTag.name);
  if (!hasTag && !craftType && !material) return null;

  const place = [giTag?.location?.district, giTag?.location?.state]
    .filter(Boolean)
    .join(', ');

  return (
    <section className="mt-10 overflow-hidden rounded-sm border border-ink/10 bg-parchment">
      <div className="border-b border-ink/10 px-5 py-4 sm:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-saffron-dark">
          Craft heritage
        </p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-ink">
          {hasTag ? giTag.name : `${craftType || material} — how it is made`}
        </h2>
        {hasTag && (
          <p className="mt-1 text-sm text-ink-soft">
            {[giTag.type, place].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      <div className="grid gap-6 px-5 py-6 sm:px-8 md:grid-cols-2">
        <div className="space-y-4">
          {hasTag && giTag.description && (
            <p className="leading-relaxed text-ink-soft">{giTag.description}</p>
          )}
          {hasTag && giTag.history && (
            <div>
              <h3 className="font-heading text-base font-semibold text-ink">History</h3>
              <p className="mt-1 leading-relaxed text-ink-soft">{giTag.history}</p>
            </div>
          )}
          {hasTag && giTag.significance && (
            <div>
              <h3 className="font-heading text-base font-semibold text-ink">Why it matters</h3>
              <p className="mt-1 leading-relaxed text-ink-soft">{giTag.significance}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {hasTag && giTag.technique && (
            <div className="rounded-sm border border-ink/10 bg-white p-4">
              <h3 className="font-heading text-base font-semibold text-ink">Technique</h3>
              <p className="mt-1 leading-relaxed text-ink-soft">{giTag.technique}</p>
            </div>
          )}
          <div className="rounded-sm border border-ink/10 bg-white p-4">
            <h3 className="font-heading text-base font-semibold text-ink">Made of</h3>
            <dl className="mt-2 space-y-1.5 text-sm">
              {craftType && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-ink-faint">Craft</dt>
                  <dd className="text-ink-soft">{craftType}</dd>
                </div>
              )}
              {material && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-ink-faint">Material</dt>
                  <dd className="text-ink-soft">{material}</dd>
                </div>
              )}
              {hasTag && giTag.products?.length > 0 && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-ink-faint">Also made</dt>
                  <dd className="text-ink-soft">{giTag.products.join(', ')}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
