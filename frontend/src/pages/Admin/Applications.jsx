import { useCallback, useEffect, useState } from 'react';
import adminApi from '../../services/adminApi';
import { toast, errMsg } from '../../components/Toast';
import { AdminShell, Loading, ErrorState, EmptyState } from '../../components/admin/AdminShell';

const STATUSES = ['', 'PENDING', 'APPROVED', 'REJECTED'];

function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [status, setStatus] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = status ? { status } : {};
      const res = await adminApi.applications(params);
      setApplications(res.data.applications || []);
    } catch (err) {
      const message = errMsg(err, 'Failed to load applications');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (application, approve) => {
    const action = approve ? 'Approve' : 'Reject';
    if (!window.confirm(`${action} application from ${application.user?.name || 'this user'}?`)) return;
    setBusyId(application._id);
    try {
      if (approve) {
        await adminApi.approveApplication(application._id);
        toast.success('Application approved — user is now an artisan');
      } else {
        await adminApi.rejectApplication(application._id);
        toast.success('Application rejected');
      }
      load();
    } catch (err) {
      toast.error(errMsg(err, `Failed to ${action.toLowerCase()} application`));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell title="Artisan Applications">
      <div className="bg-white rounded-xl shadow-md p-4 mb-4 flex flex-wrap gap-3 items-center">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-amber-200 rounded-lg px-3 py-2 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || 'All'}</option>
          ))}
        </select>
        <button onClick={load} className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm">
          Refresh
        </button>
        <span className="text-sm text-amber-600">{applications.length} applications</span>
      </div>

      {loading && <Loading />}
      {!loading && error && <ErrorState message={error} />}
      {!loading && !error && applications.length === 0 && <EmptyState message="No applications found" />}

      {!loading && !error && applications.length > 0 && (
        <div className="space-y-4">
          {applications.map((application) => (
            <div key={application._id} className="bg-white rounded-xl shadow-md p-5">
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <p className="font-bold text-amber-900">{application.businessName}</p>
                  <p className="text-sm text-amber-600">
                    {application.user?.name} · {application.user?.email}
                  </p>
                  <p className="text-sm text-amber-700 mt-2">{application.description}</p>
                  <p className="text-xs text-amber-600 mt-2">
                    Crafts: {(application.craftTypes || []).join(', ')} · Experience: {application.yearsOfExperience} yrs
                    {application.location?.city ? ` · ${application.location.city}` : ''}
                  </p>
                  {application.adminNotes && (
                    <p className="text-xs text-amber-500 mt-1">Notes: {application.adminNotes}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    application.status === 'APPROVED'
                      ? 'bg-green-100 text-green-800'
                      : application.status === 'REJECTED'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-800'
                  }`}>
                    {application.status}
                  </span>
                  {application.status === 'PENDING' && (
                    <div className="flex gap-3 mt-3 justify-end">
                      <button
                        onClick={() => decide(application, true)}
                        disabled={busyId === application._id}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm disabled:opacity-40"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => decide(application, false)}
                        disabled={busyId === application._id}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm disabled:opacity-40"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}

export default AdminApplications;
