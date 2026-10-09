import { Link } from 'react-router-dom';

function Workshops() {
  const workshops = [
    { id: 1, title: 'Learn Block Printing', artisan: 'Ramesh Kumar', date: 'Dec 15, 2026', price: 999, participants: 8/12, emoji: '🧵' },
    { id: 2, title: 'Pottery Making Workshop', artisan: 'Kamla Bai', date: 'Dec 18, 2026', price: 1499, participants: 10/15, emoji: '🏺' },
    { id: 3, title: 'Kalamkari Art Basics', artisan: 'Venkat Rao', date: 'Dec 20, 2026', price: 799, participants: 12/20, emoji: '🎨' },
    { id: 4, title: 'Jewelry Making', artisan: 'Sunita Devi', date: 'Dec 22, 2026', price: 1299, participants: 6/10, emoji: '💎' },
  ];

  return (
    <div className="min-h-screen bg-amber-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-amber-900 mb-4">Live Workshops</h1>
          <p className="text-amber-700 max-w-2xl mx-auto">
            Learn traditional crafts directly from master artisans. Interactive sessions, 
            hands-on learning, and certificates upon completion.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {workshops.map(workshop => (
            <div key={workshop.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition">
              <div className="bg-amber-100 h-40 flex items-center justify-center text-6xl">
                {workshop.emoji}
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-amber-900">{workshop.title}</h3>
                <p className="text-sm text-amber-600 mt-1">by {workshop.artisan}</p>
                <p className="text-sm text-amber-600 mt-2">📅 {workshop.date}</p>
                <p className="text-sm text-amber-600">⏱️ 3 hours</p>
                <div className="mt-3">
                  <div className="text-xs text-amber-600 mb-1">{workshop.participants} enrolled</div>
                  <div className="w-full bg-amber-200 rounded-full h-2">
                    <div className="bg-amber-600 h-2 rounded-full" style={{ width: `${(workshop.participants / 20) * 100}%` }}></div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-lg font-bold text-amber-900">₹{workshop.price}</span>
                  <Link 
                    to={`/workshop/${workshop.id}`}
                    className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-800 transition"
                  >
                    Book Now
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Workshops;
