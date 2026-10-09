// Shared status badges for customer-facing order pages.

const ORDER_STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-sky-100 text-sky-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const PAYMENT_STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-700',
};

const title = (value) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Unknown');

export const OrderStatusBadge = ({ status }) => (
  <span
    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
      ORDER_STATUS_STYLES[status] || 'bg-amber-100 text-amber-800'
    }`}
  >
    {title(status)}
  </span>
);

export const PaymentStatusBadge = ({ status }) => (
  <span
    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
      PAYMENT_STATUS_STYLES[status] || 'bg-amber-100 text-amber-800'
    }`}
  >
    {title(status)}
  </span>
);
