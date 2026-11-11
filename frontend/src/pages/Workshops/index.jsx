import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loading, ErrorState, EmptyState, Pager } from '../../components/admin/AdminShell';
import { toast, errMsg } from '../../components/Toast';
import { workshopService } from '../../services/workshopService';
import { inr } from '../../utils/format';

const LEVELS = ['beginner', 'intermediate', 'advanced', 'all'];
const LOCATION_TYPES = ['online', 'offline', 'hybrid'];

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const firstUpcoming = (workshop) => {
  const slots = (workshop.schedule || [])
    .filter((s) => s.date && new Date(s.date).getTime() > Date.now())
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  return slots[0] || null;
};

function Workshops() {
  const [workshops, setWorkshops] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    craftType: '',
    level: '',
    location: '',
    city: '',
    from: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 12 };
      if (filters.craftType) params.craftType = filters.craftType.trim();
      if (filters.level) params.level = filters.level;
      if (filters.location) params.location = filters.location;
      if (filters.city) params.city = filters.city.trim();
      if (filters.from) params.from = filters.from;
      const res = await workshopService.getAll(params);
      setWorkshops(res.data.workshops || []);
      setPages(res.data.pages || 0);
      setTotal(res.data.total || 0);
    } catch (err) {
      const message = errMsg(err, 'Failed to load workshops');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ craftType: '', level: '', location: '', city: '', from: '' });
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-amber-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-900 mb-4">Live Workshops</h1>
          <p className="text-amber-700 max-w-2xl mx-auto">
            Learn traditional crafts directly from master artisans. Interactive sessions and
            hands-on learning — pay at the venue.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex flex-wrap gap-3 items-center">
          <input
            value={filters.craftType}
            onChange={(e) => setFilter('craftType', e.target.value)}
            placeholder="Craft type (e.g. textiles)"
            className="border border-amber-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-40"
          />
          <select
            value={filters.level}
            onChange={(e) => setFilter('level', e.target.value)}
            className="border border-amber-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All levels</option>
            {LEVELS.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
          <select
            value={filters.location}
            onChange={(e) => setFilter('location', e.target.value)}
            className="border border-amber-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Any mode</option>
            {LOCATION_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <input
            value={filters.city}
            onChange={(e) => setFilter('city', e.target.value)}
            placeholder="City"
            className="border border-amber-200 rounded-lg px-3 py-2 text-sm min-w-32"
          />
          <label className="text-sm text-amber-700 flex items-center gap-2">
            From
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilter('from', e.target.value)}
              className="border border-amber-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <button onClick={load} className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm">
            Apply
          </button>
          <button onClick={clearFilters} className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm">
            Clear
          </button>
        </div>

        {loading && <Loading />}
        {!loading && error && (
          <div>
            <ErrorState message={error} />
            <div className="text-center mt-4">
              <button onClick={load} className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm">
                Retry
              </button>
            </div>
          </div>
        )}
        {!loading && !error && workshops.length === 0 && (
          <EmptyState message="No workshops found — try clearing the filters" />
        )}

        {!loading && !error && workshops.length > 0 && (
          <>
            <p className="text-sm text-amber-600 mb-4">{total} workshop{total === 1 ? '' : 's'}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {workshops.map((workshop) => {
                const slot = firstUpcoming(workshop);
                const seatsLeft = workshop.seatsLeft ?? Math.max(0, workshop.maxParticipants - workshop.currentParticipants);
                return (
                  <div key={workshop._id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition flex flex-col">
                    <div className="bg-amber-100 h-40 flex items-center justify-center text-6xl overflow-hidden">
                      {workshop.images?.[0] ? (
                        <img src={workshop.images[0]} alt={workshop.title} className="w-full h-full object-cover" />
                      ) : (
                        <span>🧵</span>
                      )}
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-amber-900">{workshop.title}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 shrink-0">
                          {workshop.level}
                        </span>
                      </div>
                      <p className="text-sm text-amber-600 mt-1">
                        by {workshop.artisan?.businessName || 'Artisan'}
                      </p>
                      <p className="text-sm text-amber-600 mt-2">
                        📅 {slot ? formatDate(slot.date) : 'Date TBA'}
                      </p>
                      <p className="text-sm text-amber-600">
                        ⏱️ {workshop.duration} {workshop.durationUnit} · {workshop.location?.type || 'online'}
                        {workshop.location?.city ? ` · ${workshop.location.city}` : ''}
                      </p>
                      <div className="mt-3">
                        <div className="text-xs text-amber-600 mb-1">
                          {seatsLeft > 0 ? `${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} left` : 'Sold out'}
                        </div>
                        <div className="w-full bg-amber-200 rounded-full h-2">
                          <div
                            className="bg-amber-600 h-2 rounded-full"
                            style={{
                              width: `${Math.min(100, ((workshop.currentParticipants || 0) / (workshop.maxParticipants || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-2">
                        <span className="text-lg font-bold text-amber-900">{inr(workshop.price)}</span>
                        <Link
                          to={`/workshop/${workshop._id}`}
                          className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-800 transition"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <Pager page={page} pages={pages} onChange={setPage} />
      </div>
    </div>
  );
}

export default Workshops;
