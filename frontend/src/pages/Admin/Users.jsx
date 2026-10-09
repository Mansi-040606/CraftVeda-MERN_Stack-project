import { useCallback, useEffect, useState } from 'react';
import adminApi from '../../services/adminApi';
import { toast, errMsg } from '../../components/Toast';
import { AdminShell, Loading, ErrorState, EmptyState, Pager } from '../../components/admin/AdminShell';

const ROLES = ['CUSTOMER', 'ARTISAN', 'ADMIN'];
const STATUSES = ['ACTIVE', 'PENDING', 'BLOCKED'];

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit };
      if (search) params.search = search;
      if (role) params.role = role;
      const res = await adminApi.users(params);
      setUsers(res.data.users || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      const message = errMsg(err, 'Failed to load users');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, role]);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (id, data) => {
    setBusyId(id);
    try {
      await adminApi.updateUser(id, data);
      toast.success('User updated');
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to update user'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (user) => {
    if (!window.confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    setBusyId(user._id);
    try {
      await adminApi.deleteUser(user._id);
      toast.success('User deleted');
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to delete user'));
    } finally {
      setBusyId(null);
    }
  };

  const pages = Math.ceil(total / limit);

  return (
    <AdminShell title="Users">
      <div className="bg-white rounded-xl shadow-md p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Search name or email"
          className="border border-amber-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-48"
        />
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          className="border border-amber-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button onClick={load} className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm">
          Search
        </button>
        <span className="text-sm text-amber-600">{total} users</span>
      </div>

      {loading && <Loading />}
      {!loading && error && <ErrorState message={error} />}
      {!loading && !error && users.length === 0 && <EmptyState message="No users found" />}

      {!loading && !error && users.length > 0 && (
        <div className="bg-white rounded-xl shadow-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-amber-600 border-b border-amber-100">
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} className="border-b border-amber-50">
                  <td className="p-3 font-medium text-amber-900">{user.name}</td>
                  <td className="p-3 text-amber-700">{user.email}</td>
                  <td className="p-3">
                    <select
                      value={user.role}
                      disabled={busyId === user._id}
                      onChange={(e) => update(user._id, { role: e.target.value })}
                      className="border border-amber-200 rounded px-2 py-1"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <select
                      value={user.status}
                      disabled={busyId === user._id}
                      onChange={(e) => update(user._id, { status: e.target.value })}
                      className="border border-amber-200 rounded px-2 py-1"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => remove(user)}
                      disabled={busyId === user._id}
                      className="text-red-600 hover:text-red-800 disabled:opacity-40"
                    >
                      Delete
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

export default AdminUsers;
