import { useCallback, useEffect, useState } from 'react';
import adminApi from '../../services/adminApi';
import { toast, errMsg } from '../../components/Toast';
import { AdminShell, Loading, ErrorState, EmptyState, Pager } from '../../components/admin/AdminShell';

const STATUSES = ['', 'pending', 'completed', 'failed', 'refunded'];
const inr = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

function AdminDonations() {
  const [donations, setDonations] = useState([]);
  const [totals, setTotals] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10 };
      if (paymentStatus) params.paymentStatus = paymentStatus;
      const res = await adminApi.donations(params);
      setDonations(res.data.donations || []);
      setTotals(res.data.totals || []);
      setPages(res.data.pages || 0);
      setTotal(res.data.total || 0);
    } catch (err) {
      const message = errMsg(err, 'Failed to load donations');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, paymentStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const sumFor = (status) => totals.find((t) => t._id === status)?.total || 0;

  return (
    <AdminShell title="Donations">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-xl shadow-md p-4 text-center">
          <p className="text-xl font-bold text-amber-900">{inr(sumFor('completed'))}</p>
          <p className="text-sm text-amber-600">Completed</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 text-center">
          <p className="text-xl font-bold text-amber-900">{inr(sumFor('pending'))}</p>
          <p className="text-sm text-amber-600">Pending</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 text-center">
          <p className="text-xl font-bold text-amber-900">{inr(sumFor('failed'))}</p>
          <p className="text-sm text-amber-600">Failed</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 text-center">
          <p className="text-xl font-bold text-amber-900">{total}</p>
          <p className="text-sm text-amber-600">Total records</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 mb-4 flex flex-wrap gap-3 items-center">
        <select
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value);
            setPage(1);
          }}
          className="border border-amber-200 rounded-lg px-3 py-2 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || 'All statuses'}</option>
          ))}
        </select>
        <button onClick={load} className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm">
          Refresh
        </button>
      </div>

      {loading && <Loading />}
      {!loading && error && <ErrorState message={error} />}
      {!loading && !error && donations.length === 0 && <EmptyState message="No donations found" />}

      {!loading && !error && donations.length > 0 && (
        <div className="bg-white rounded-xl shadow-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-amber-600 border-b border-amber-100">
                <th className="p-3">Date</th>
                <th className="p-3">Donor</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Craft type</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((donation) => (
                <tr key={donation._id} className="border-b border-amber-50">
                  <td className="p-3 text-amber-700">{new Date(donation.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 text-amber-900">
                    {donation.isAnonymous ? 'Anonymous' : donation.donor?.name || 'Unknown'}
                    <span className="block text-xs text-amber-500">{donation.isAnonymous ? '' : donation.donor?.email}</span>
                  </td>
                  <td className="p-3 font-medium text-amber-900">{inr(donation.amount)}</td>
                  <td className="p-3 text-amber-700">{donation.craftType || '—'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      donation.paymentStatus === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : donation.paymentStatus === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-800'
                    }`}>
                      {donation.paymentStatus}
                    </span>
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

export default AdminDonations;
