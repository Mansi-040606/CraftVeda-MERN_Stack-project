import { useCallback, useEffect, useState } from 'react';
import adminApi from '../../services/adminApi';
import { toast, errMsg } from '../../components/Toast';
import { AdminShell, Loading, ErrorState, EmptyState, Pager } from '../../components/admin/AdminShell';

function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [isApproved, setIsApproved] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10 };
      if (isApproved) params.isApproved = isApproved;
      const res = await adminApi.reviews(params);
      setReviews(res.data.reviews || []);
      setPages(res.data.pages || 0);
      setTotal(res.data.total || 0);
    } catch (err) {
      const message = errMsg(err, 'Failed to load reviews');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, isApproved]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (review) => {
    setBusyId(review._id);
    try {
      await adminApi.patchReview(review._id, { isApproved: !review.isApproved });
      toast.success(review.isApproved ? 'Review hidden' : 'Review approved');
      load();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to update review'));
    } finally {
      setBusyId(null);
    }
  };

  const target = (review) =>
    review.product?.name || review.artisan?.businessName || review.workshop || 'General';

  return (
    <AdminShell title="Reviews">
      <div className="bg-white rounded-xl shadow-md p-4 mb-4 flex flex-wrap gap-3 items-center">
        <select
          value={isApproved}
          onChange={(e) => {
            setIsApproved(e.target.value);
            setPage(1);
          }}
          className="border border-amber-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All reviews</option>
          <option value="true">Approved</option>
          <option value="false">Pending</option>
        </select>
        <button onClick={load} className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm">
          Refresh
        </button>
        <span className="text-sm text-amber-600">{total} reviews</span>
      </div>

      {loading && <Loading />}
      {!loading && error && <ErrorState message={error} />}
      {!loading && !error && reviews.length === 0 && <EmptyState message="No reviews found" />}

      {!loading && !error && reviews.length > 0 && (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review._id} className="bg-white rounded-xl shadow-md p-5 flex justify-between gap-4">
              <div>
                <p className="font-medium text-amber-900">
                  {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)} {review.title}
                </p>
                <p className="text-sm text-amber-700 mt-1">{review.comment}</p>
                <p className="text-xs text-amber-500 mt-2">
                  by {review.user?.name || 'Unknown'} on {target(review)} ·{' '}
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className={`px-2 py-1 rounded text-xs ${review.isApproved ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                  {review.isApproved ? 'Approved' : 'Pending'}
                </span>
                <div className="mt-3">
                  <button
                    onClick={() => toggle(review)}
                    disabled={busyId === review._id}
                    className="px-3 py-1 bg-amber-700 text-white rounded text-sm disabled:opacity-40"
                  >
                    {review.isApproved ? 'Hide' : 'Approve'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pager page={page} pages={pages} onChange={setPage} />
    </AdminShell>
  );
}

export default AdminReviews;
