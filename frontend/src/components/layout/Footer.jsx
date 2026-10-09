import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="bg-amber-900 text-amber-100 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🏺</span>
              <span className="text-xl font-bold text-white">CraftVeda</span>
            </div>
            <p className="text-sm text-amber-200">
              Connecting traditional artisans with the world. Preserving Indian heritage, one craft at a time.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Shop</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/products" className="hover:text-white transition">All Products</Link></li>
              <li><Link to="/products?category=textiles" className="hover:text-white transition">Textiles</Link></li>
              <li><Link to="/products?category=pottery" className="hover:text-white transition">Pottery</Link></li>
              <li><Link to="/products?category=jewelry" className="hover:text-white transition">Jewelry</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Discover</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/artisans" className="hover:text-white transition">Our Artisans</Link></li>
              <li><Link to="/workshops" className="hover:text-white transition">Workshops</Link></li>
              <li><Link to="/gi-search" className="hover:text-white transition">GI Tags</Link></li>
              <li><Link to="/about" className="hover:text-white transition">Heritage Stories</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/donate" className="hover:text-white transition">Donate</Link></li>
              <li><Link to="/orders" className="hover:text-white transition">Track Order</Link></li>
              <li><Link to="/auth" className="hover:text-white transition">Seller Registration</Link></li>
              <li><Link to="/admin" className="hover:text-white transition">Admin</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-amber-800 mt-8 pt-8 text-center text-sm text-amber-300">
          <p>© {new Date().getFullYear()} CraftVeda. Preserving India&apos;s artistic heritage.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
