import { Link } from 'react-router-dom';

function Orders() {
  const orders = [
    { id: 'CV-12345', date: 'Dec 10, 2026', items: 2, total: 15997, status: 'Delivered', statusColor: 'bg-green-100 text-green-800' },
    { id: 'CV-12346', date: 'Dec 15, 2026', items: 1, total: 12999, status: 'Shipped', statusColor: 'bg-blue-100 text-blue-800' },
    { id: 'CV-12347', date: 'Dec 18, 2026', items: 3, total: 8999, status: 'Processing', statusColor: 'bg-yellow-100 text-yellow-800' },
  ];

  return (
    <div className="min-h-screen bg-amber-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-amber-900 mb-8">My Orders</h1>

        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-xl shadow-md p-6">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <p className="text-sm text-amber-600">Order #{order.id}</p>
                  <p className="text-sm text-amber-600 mt-1">Placed on {order.date}</p>
                  <p className="text-sm text-amber-600 mt-1">{order.items} item(s)</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-amber-900">₹{order.total.toLocaleString()}</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm mt-2 ${order.statusColor}`}>
                    {order.status}
                  </span>
                </div>
              </div>
              <div className="flex gap-4 mt-4">
                <Link 
                  to={`/order/${order.id}`}
                  className="text-amber-700 hover:text-amber-900 font-medium text-sm"
                >
                  View Details →
                </Link>
                <button className="text-amber-700 hover:text-amber-900 font-medium text-sm">
                  Track Order
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Orders;
