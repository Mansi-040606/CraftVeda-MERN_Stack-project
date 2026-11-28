import { Link } from 'react-router-dom';
import { LogoMark, Wordmark } from '../common/Logo';

const colLink =
  'text-sm text-cream/70 transition hover:text-saffron';

function Footer() {
  return (
    <footer className="mt-auto bg-ink text-cream">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <LogoMark className="h-9 w-9" decorative />
              <Wordmark className="text-xl" tone="light" />
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-cream/70">
              Connecting traditional artisans with the world. Preserving Indian heritage, one craft
              at a time.
            </p>
            <div className="rule-ornament mt-5 max-w-xs" aria-hidden="true" />
          </div>

          <div>
            <h3 className="mb-4 font-display text-base font-semibold text-saffron">Shop</h3>
            <ul className="space-y-2">
              <li><Link to="/products" className={colLink}>All Products</Link></li>
              <li><Link to="/products?category=textiles" className={colLink}>Textiles</Link></li>
              <li><Link to="/products?category=pottery" className={colLink}>Pottery</Link></li>
              <li><Link to="/products?category=jewelry" className={colLink}>Jewelry</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-display text-base font-semibold text-saffron">Discover</h3>
            <ul className="space-y-2">
              <li><Link to="/artisans" className={colLink}>Our Artisans</Link></li>
              <li><Link to="/workshops" className={colLink}>Workshops</Link></li>
              <li><Link to="/gi-search" className={colLink}>GI Tags</Link></li>
              <li><Link to="/stories" className={colLink}>Craft Stories</Link></li>
              <li><Link to="/about" className={colLink}>About Us</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-display text-base font-semibold text-saffron">Support</h3>
            <ul className="space-y-2">
              <li><Link to="/donate" className={colLink}>Donate</Link></li>
              <li><Link to="/verify" className={colLink}>Verify Certificate</Link></li>
              <li><Link to="/orders" className={colLink}>Track Order</Link></li>
              <li><Link to="/auth" className={colLink}>Seller Registration</Link></li>
              <li><Link to="/admin" className={colLink}>Admin</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-cream/15 pt-8 text-center text-sm text-cream/60">
          <p>
            © {new Date().getFullYear()} CraftVeda. Preserving India&apos;s artistic heritage.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
