import { Link } from 'react-router-dom';
import { categoryLabel } from '../../constants/categories';
import { inr } from '../../utils/format';
import ProductImage from './ProductImage';

// Reusable product card for listing pages (Products, search results, ...).
// Styled as a small gallery print: cream frame, serif title, terracotta price.
function ProductCard({ product }) {
  const artisanName = product.artisan?.businessName;
  const outOfStock = product.stock < 1;

  return (
    <Link
      to={`/product/${product._id}`}
      className="group flex flex-col overflow-hidden rounded-sm border border-ink/10 bg-white transition-shadow duration-300 hover:shadow-[0_22px_45px_-28px_rgba(43,26,18,0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
    >
      <div className="relative overflow-hidden">
        <ProductImage
          src={product.images?.[0]}
          alt={product.name}
          frame="aspect-[4/5]"
          w={640}
          h={800}
          imgClassName="transition-transform duration-700 ease-out group-hover:scale-[1.05]"
        />
        {outOfStock && (
          <span className="absolute left-3 top-3 rounded-sm bg-clay-red px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm">
            Sold out
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-saffron-dark">
          {categoryLabel(product.category)}
        </span>
        <h3 className="mt-1.5 line-clamp-2 font-heading text-lg leading-snug text-ink">
          {product.name}
        </h3>
        <p className="mt-1 line-clamp-1 text-sm italic text-ink-soft">
          {artisanName ? `by ${artisanName}` : 'CraftVeda Artisan'}
        </p>

        <div className="mt-auto flex items-baseline justify-between pt-4">
          <span className="font-display text-xl font-semibold text-terracotta-dark">
            {inr(product.price)}
          </span>
        </div>
      </div>
    </Link>
  );
}

// Loading placeholder that mirrors the card's exact geometry (no layout shift).
export function ProductCardSkeleton({ className = '' }) {
  return (
    <div
      className={`overflow-hidden rounded-sm border border-ink/10 bg-white ${className}`}
      aria-hidden="true"
    >
      <div className="shimmer aspect-[4/5] w-full" />
      <div className="space-y-3 p-4">
        <div className="shimmer h-3 w-20 rounded-sm" />
        <div className="shimmer h-5 w-full rounded-sm" />
        <div className="shimmer h-3 w-28 rounded-sm" />
        <div className="shimmer mt-4 h-6 w-24 rounded-sm" />
      </div>
    </div>
  );
}

export default ProductCard;
