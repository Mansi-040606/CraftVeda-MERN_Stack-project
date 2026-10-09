import { Link } from 'react-router-dom';
import { categoryLabel } from '../../constants/categories';
import { inr } from '../../utils/format';

// Reusable product card for listing pages (Products, search results, ...).
function ProductCard({ product }) {
  const artisanName = product.artisan?.businessName;
  const outOfStock = product.stock < 1;

  return (
    <Link
      to={`/product/${product._id}`}
      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition group"
    >
      <div className="bg-amber-100 h-48 flex items-center justify-center overflow-hidden">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition"
          />
        ) : (
          <span className="text-6xl">🏺</span>
        )}
      </div>
      <div className="p-4">
        <span className="text-xs text-amber-600 font-medium">{categoryLabel(product.category)}</span>
        <h3 className="font-semibold text-amber-900 mt-1 line-clamp-2">{product.name}</h3>
        <p className="text-sm text-amber-600 mt-1">
          {artisanName ? `by ${artisanName}` : 'CraftVeda Artisan'}
        </p>
        <div className="flex items-center justify-between mt-2">
          <p className="text-lg font-bold text-amber-800">{inr(product.price)}</p>
          {outOfStock && <span className="text-xs text-red-600 font-medium">Out of stock</span>}
        </div>
      </div>
    </Link>
  );
}

export default ProductCard;
