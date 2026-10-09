import { useCallback, useEffect, useState } from 'react';
import adminApi from '../../services/adminApi';
import { toast, errMsg } from '../../components/Toast';
import { AdminShell, Loading, ErrorState, EmptyState, Pager } from '../../components/admin/AdminShell';

const inr = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

function AdminWorkshops() {
  const [workshops, setWorkshops] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      const res = await adminApi.workshops(params);
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
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (workshop) => {
    setBusyId(workshop._id);
    try {
      await adminApi.patchWorkshop(workshop._id, { isActive: !workshop.isActive });
      toast.success(workshop.isActive ? 'Workshop hidden' : 'Workshop activated');
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to update workshop'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell title="Workshops">
      <div className="bg-white rounded-xl shadow-md p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Search workshops"
          className="border border-amber-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-48"
        />
        <button onClick={load} className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm">
          Search
        </button>
        <span className="text-sm text-amber-600">{total} workshops</span>
      </div>

      {loading && <Loading />}
      {!loading && error && <ErrorState message={error} />}
      {!loading && !error && workshops.length === 0 && <EmptyState message="No workshops found" />}

      {!loading && !error && workshops.length > 0 && (
        <div className="bg-white rounded-xl shadow-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-amber-600 border-b border-amber-100">
                <th className="p-3">Workshop</th>
                <th className="p-3">Artisan</th>
                <th className="p-3">Level</th>
                <th className="p-3">Price</th>
                <th className="p-3">Seats</th>
                <th className="p-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {workshops.map((workshop) => (
                <tr key={workshop._id} className="border-b border-amber-50">
                  <td className="p-3 font-medium text-amber-900">
                    {workshop.title}
                    <span className="block text-xs text-amber-500">{workshop.craftType}</span>
                  </td>
                  <td className="p-3 text-amber-700">{workshop.artisan?.businessName || '—'}</td>
                  <td className="p-3 text-amber-700">{workshop.level}</td>
                  <td className="p-3 text-amber-900">{inr(workshop.price)}</td>
                  <td className="p-3 text-amber-700">{workshop.currentParticipants}/{workshop.maxParticipants}</td>
                  <td className="p-3">
                    <button
                      onClick={() => toggle(workshop)}
                      disabled={busyId === workshop._id}
                      className={`px-2 py-1 rounded text-xs disabled:opacity-40 ${workshop.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}
                    >
                      {workshop.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={page} pages={pages} onChange={setPage} />
    </AdminShell>
  );
}

export default AdminWorkshops;
