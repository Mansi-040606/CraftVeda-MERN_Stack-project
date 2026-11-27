import { Link } from 'react-router-dom';
import ProductImage from './ProductImage';

/**
 * "Meet the maker" block shown on the product page — the human story behind
 * the object, with the artisan's portrait, location and craft specialities.
 */
export default function MakerSection({ artisan }) {
  if (!artisan) return null;

  const place = [artisan.location?.city, artisan.location?.state]
    .filter(Boolean)
    .join(', ');
  const crafts = artisan.craftTypes || [];

  return (
    <section className="mt-10 overflow-hidden rounded-sm border border-ink/10 bg-white">
      {/* cover strip */}
      <div className="relative h-32 bg-linen sm:h-40">
        <ProductImage
          src={artisan.coverImage}
          alt=""
          frame="h-full w-full"
          preset="lightbox_1600"
          imgClassName="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/55 via-ink/20 to-transparent" />
      </div>

      <div className="relative px-5 pb-6 sm:px-8">
        <div className="-mt-10 flex items-end gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-white bg-linen border border-ink/10 sm:h-24 sm:w-24">
            <ProductImage
              src={artisan.profileImage}
              alt={artisan.businessName}
              frame="h-full w-full"
              preset="avatar_160"
            />
          </div>
          <div className="pb-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-saffron-dark">
              Meet the maker
            </p>
            <h2 className="mt-0.5 font-display text-2xl font-semibold text-ink">
              {artisan.businessName}
            </h2>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-soft">
          {place && <span>{place}</span>}
          {artisan.isVerified && (
            <span className="rounded-sm bg-moss-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-moss">
              Verified artisan
            </span>
          )}
          {artisan.yearsOfExperience > 0 && (
            <span>{artisan.yearsOfExperience}+ years of craft</span>
          )}
        </div>

        {crafts.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {crafts.map((c) => (
              <li
                key={c}
                className="rounded-sm border border-ink/10 bg-parchment px-2.5 py-1 text-xs font-medium capitalize text-ink-soft"
              >
                {c}
              </li>
            ))}
          </ul>
        )}

        {artisan.story && (
          <p className="mt-4 max-w-3xl whitespace-pre-line leading-relaxed text-ink-soft">
            {artisan.story}
          </p>
        )}

        <Link
          to={`/artisan/${artisan._id}`}
          className="mt-5 inline-flex items-center gap-2 border-b border-terracotta pb-0.5 text-sm font-semibold text-terracotta-dark transition hover:border-ink hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
        >
          Visit the artisan's studio
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
