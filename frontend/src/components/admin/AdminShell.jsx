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
  { to: '/admin/reviews', label: 'Reviews' },
];

export function AdminShell({ title, children }) {
  return (
    <div className="min-h-screen bg-amber-50 py-6">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-amber-900 mb-4">{title}</h1>
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

export function Loading() {
  return (
    <div className="bg-white rounded-xl shadow-md p-10 text-center text-amber-700">
      Loading...
    </div>
  );
}

export function ErrorState({ message }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-10 text-center">
      <p className="text-red-600 font-medium mb-4">{message || 'Failed to load data'}</p>
    </div>
  );
}

export function EmptyState({ message = 'No records found' }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-10 text-center text-amber-600">
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
        className="px-3 py-1 rounded bg-white shadow disabled:opacity-40 text-amber-800"
      >
        Prev
      </button>
      <span className="text-amber-700">
        Page {page} of {pages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
        className="px-3 py-1 rounded bg-white shadow disabled:opacity-40 text-amber-800"
      >
        Next
      </button>
    </div>
  );
}

export default AdminShell;
