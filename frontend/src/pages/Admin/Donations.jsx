import { useCallback, useEffect, useState } from 'react';
import adminApi from '../../services/adminApi';
import { toast, errMsg } from '../../components/Toast';
import { AdminShell, Loading, ErrorState, EmptyState, Pager } from '../../components/admin/AdminShell';

const STATUSES = ['', 'pending', 'completed', 'failed', 'refunded'];
const EDITABLE_STATUSES = ['pending', 'completed', 'failed', 'refunded'];
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
  const [busyId, setBusyId] = useState(null);

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

  const changeStatus = async (donation, nextStatus) => {
    setBusyId(donation._id);
    try {
      await adminApi.updateDonationStatus(donation._id, nextStatus);
      toast.success(`Donation marked ${nextStatus}`);
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to update donation status'));
    } finally {
      setBusyId(null);
    }
  };

  const sumFor = (status) => totals.find((t) => t._id === status)?.total || 0;

  return (
    <AdminShell title="Donations">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-sm border border-ink/10 p-4 text-center">
          <p className="text-xl font-bold text-ink">{inr(sumFor('completed'))}</p>
          <p className="text-sm text-ink-soft">Completed</p>
        </div>
        <div className="bg-white rounded-sm border border-ink/10 p-4 text-center">
          <p className="text-xl font-bold text-ink">{inr(sumFor('pending'))}</p>
          <p className="text-sm text-ink-soft">Pending</p>
        </div>
        <div className="bg-white rounded-sm border border-ink/10 p-4 text-center">
          <p className="text-xl font-bold text-ink">{inr(sumFor('failed'))}</p>
          <p className="text-sm text-ink-soft">Failed</p>
        </div>
        <div className="bg-white rounded-sm border border-ink/10 p-4 text-center">
          <p className="text-xl font-bold text-ink">{total}</p>
          <p className="text-sm text-ink-soft">Total records</p>
        </div>
      </div>

      <div className="bg-white rounded-sm border border-ink/10 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <select
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value);
            setPage(1);
          }}
          className="border border-ink/10 rounded-sm px-3 py-2 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || 'All statuses'}</option>
          ))}
        </select>
        <button onClick={load} className="px-4 py-2 bg-terracotta text-white rounded-sm text-sm">
          Refresh
        </button>
      </div>

      {loading && <Loading />}
      {!loading && error && <ErrorState message={error} />}
      {!loading && !error && donations.length === 0 && <EmptyState message="No donations found" />}

      {!loading && !error && donations.length > 0 && (
        <div className="bg-white rounded-sm border border-ink/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-soft border-b border-ink/10">
                <th className="p-3">Date</th>
                <th className="p-3">Donor</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Craft type</th>
                <th className="p-3">Status</th>
                <th className="p-3">Update</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((donation) => (
                <tr key={donation._id} className="border-b border-ink/5">
                  <td className="p-3 text-terracotta-dark">{new Date(donation.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 text-ink">
                    {donation.isAnonymous ? 'Anonymous' : donation.donor?.name || 'Unknown'}
                    <span className="block text-xs text-ink-faint">{donation.isAnonymous ? '' : donation.donor?.email}</span>
                  </td>
                  <td className="p-3 font-medium text-ink">{inr(donation.amount)}</td>
                  <td className="p-3 text-terracotta-dark">{donation.craftType || '—'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      donation.paymentStatus === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : donation.paymentStatus === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-parchment text-ink-soft'
                    }`}>
                      {donation.paymentStatus}
                    </span>
                  </td>
                  <td className="p-3">
                    <select
                      value={donation.paymentStatus}
                      disabled={busyId === donation._id}
                      onChange={(e) => changeStatus(donation, e.target.value)}
                      className="border border-ink/10 rounded px-2 py-1 text-xs"
                    >
                      {EDITABLE_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
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
