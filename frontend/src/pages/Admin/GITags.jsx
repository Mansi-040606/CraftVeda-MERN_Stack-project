import { useCallback, useEffect, useState } from 'react';
import adminApi from '../../services/adminApi';
import { toast, errMsg } from '../../components/Toast';
import { AdminShell, Loading, ErrorState, EmptyState, Pager } from '../../components/admin/AdminShell';

function AdminGITags() {
  const [giTags, setGITags] = useState([]);
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
      const res = await adminApi.giTags(params);
      setGITags(res.data.giTags || []);
      setPages(res.data.pages || 0);
      setTotal(res.data.total || 0);
    } catch (err) {
      const message = errMsg(err, 'Failed to load GI tags');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (giTag) => {
    setBusyId(giTag._id);
    try {
      await adminApi.patchGITag(giTag._id, { isActive: !giTag.isActive });
      toast.success(giTag.isActive ? 'GI tag deactivated' : 'GI tag activated');
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to update GI tag'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell title="GI Tags">
      <div className="bg-white rounded-xl shadow-md p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Search name, type or state"
          className="border border-amber-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-48"
        />
        <button onClick={load} className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm">
          Search
        </button>
        <span className="text-sm text-amber-600">{total} GI tags</span>
      </div>

      {loading && <Loading />}
      {!loading && error && <ErrorState message={error} />}
      {!loading && !error && giTags.length === 0 && <EmptyState message="No GI tags found" />}

      {!loading && !error && giTags.length > 0 && (
        <div className="bg-white rounded-xl shadow-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-amber-600 border-b border-amber-100">
                <th className="p-3">Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">State</th>
                <th className="p-3">Products</th>
                <th className="p-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {giTags.map((giTag) => (
                <tr key={giTag._id} className="border-b border-amber-50">
                  <td className="p-3 font-medium text-amber-900">{giTag.name}</td>
                  <td className="p-3 text-amber-700">{giTag.type}</td>
                  <td className="p-3 text-amber-700">{giTag.location?.state}</td>
                  <td className="p-3 text-amber-700">{(giTag.products || []).length}</td>
                  <td className="p-3">
                    <button
                      onClick={() => toggle(giTag)}
                      disabled={busyId === giTag._id}
                      className={`px-2 py-1 rounded text-xs disabled:opacity-40 ${giTag.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}
                    >
                      {giTag.isActive ? 'Active' : 'Inactive'}
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

export default AdminGITags;
