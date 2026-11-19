import { NavLink } from 'react-router-dom';

const links = [
  { to: '/artisan/dashboard', label: 'Dashboard' },
  { to: '/artisan/products', label: 'My Products' },
  { to: '/artisan/orders', label: 'My Orders' },
  { to: '/artisan/workshops', label: 'My Workshops' },
  { to: '/artisan/profile', label: 'My Profile' },
];

// Shared layout for the artisan pages (mirrors AdminShell).
export function ArtisanShell({ title, children, actions }) {
  return (
    <div className="min-h-screen bg-cream py-6">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
          {actions}
        </div>
        <nav className="mb-6 flex flex-wrap gap-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-sm px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-terracotta text-white'
                    : 'border border-ink/10 bg-white text-ink-soft hover:bg-parchment'
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
