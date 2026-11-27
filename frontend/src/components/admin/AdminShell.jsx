import { NavLink } from 'react-router-dom';

const links = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/applications', label: 'Applications' },
  { to: '/admin/workshops', label: 'Workshops' },
  { to: '/admin/donations', label: 'Donations' },
  { to: '/admin/gi-tags', label: 'GI Tags' },
  { to: '/admin/stories', label: 'Craft Stories' },
  { to: '/admin/reviews', label: 'Reviews' },
];

export function AdminShell({ title, children }) {
  return (
    <div className="min-h-screen bg-cream py-6">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-ink mb-4">{title}</h1>
        <nav className="flex flex-wrap gap-2 mb-6">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-sm text-sm font-medium transition ${
                  isActive ? 'bg-terracotta text-white' : 'bg-white text-ink-soft hover:bg-linen'
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

export function Loading() {
  return (
    <div className="bg-white rounded-sm border border-ink/10 p-10 text-center text-terracotta-dark">
      Loading...
    </div>
  );
}

export function ErrorState({ message }) {
  return (
    <div className="bg-white rounded-sm border border-ink/10 p-10 text-center">
      <p className="text-red-600 font-medium mb-4">{message || 'Failed to load data'}</p>
    </div>
  );
}

export function EmptyState({ message = 'No records found' }) {
  return (
    <div className="bg-white rounded-sm border border-ink/10 p-10 text-center text-ink-soft">
      {message}
    </div>
  );
}

export function Pager({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="flex items-center gap-4 mt-4 justify-center text-sm">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1 rounded bg-white shadow disabled:opacity-40 text-ink-soft"
      >
        Prev
      </button>
      <span className="text-terracotta-dark">
        Page {page} of {pages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
        className="px-3 py-1 rounded bg-white shadow disabled:opacity-40 text-ink-soft"
      >
        Next
      </button>
    </div>
  );
}

export default AdminShell;
