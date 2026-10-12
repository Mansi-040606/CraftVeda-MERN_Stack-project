import { NavLink } from 'react-router-dom';

const links = [
  { to: '/artisan/dashboard', label: 'Dashboard' },
  { to: '/artisan/products', label: 'My Products' },
  { to: '/artisan/orders', label: 'My Orders' },
];

// Shared layout for the artisan pages (mirrors AdminShell).
export function ArtisanShell({ title, children, actions }) {
  return (
    <div className="min-h-screen bg-amber-50 py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h1 className="text-2xl font-bold text-amber-900">{title}</h1>
          {actions}
        </div>
        <nav className="flex flex-wrap gap-2 mb-6">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-amber-700 text-white' : 'bg-white text-amber-800 hover:bg-amber-100'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        {children}
      </div>
    </div>
  );
}

export default ArtisanShell;
