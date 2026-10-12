import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reviewService } from '../../services/reviewService';
import { useAuth } from '../../context/AuthContext';
import { errMsg } from '../Toast';
import StarRating from './StarRating';
import ReviewCard from './ReviewCard';
import ReviewForm from './ReviewForm';

// Reviews block for ProductDetail: summary + list + optional write form.
function ReviewsSection({ productId }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ averageRating: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [canReview, setCanReview] = useState(null); // null = unknown / not checked

  const loadReviews = useCallback(async () => {
    try {
      const res = await reviewService.getProductReviews(productId);
      setReviews(res.data.reviews);
      setSummary({ averageRating: res.data.averageRating, total: res.data.total });
      setError(null);
    } catch (err) {
      setError(errMsg(err, 'Failed to load reviews'));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    setLoading(true);
    loadReviews();
  }, [loadReviews]);

  // Ask the server whether the current user may review (only when logged in).
  useEffect(() => {
    if (!isAuthenticated) {
      setCanReview(null);
      return;
    }
    let cancelled = false;
    reviewService
      .canReview(productId)
      .then((res) => { if (!cancelled) setCanReview(res.data); })
      .catch(() => { if (!cancelled) setCanReview(null); });
    return () => { cancelled = true; };
  }, [productId, isAuthenticated, reviews.length]);

  const handleHelpful = async (id) => {
    if (!isAuthenticated) return navigate('/auth');
    try {
      await reviewService.markHelpful(id);
      loadReviews();
    } catch {
      /* toast already handled by interceptor path; ignore silent fail */
    }
  };

  return (
    <div className="mt-8 bg-white rounded-xl shadow-md p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-amber-900">Customer Reviews</h2>
        <div className="flex items-center gap-3">
          <StarRating value={summary.averageRating} size="text-xl" />
          <span className="text-amber-800 font-medium">
            {summary.averageRating > 0 ? summary.averageRating.toFixed(1) : 'No ratings'}
          </span>
          <span className="text-sm text-amber-600">({summary.total} review{summary.total === 1 ? '' : 's'})</span>
        </div>
      </div>

      {canReview?.allowed && (
        <div className="mb-6">
          <ReviewForm
            productId={productId}
            onSubmitted={() => {
              loadReviews();
              setCanReview({ allowed: false, alreadyReviewed: true, reason: 'You have already reviewed this product' });
            }}
          />
        </div>
      )}

      {isAuthenticated && canReview && !canReview.allowed && canReview.reason && (
        <p className="text-sm text-amber-600 mb-6 italic">{canReview.reason}</p>
      )}

      {!isAuthenticated && (
        <p className="text-sm text-amber-600 mb-6 italic">
          Purchased this product?{' '}
          <button onClick={() => navigate('/auth')} className="underline text-amber-800 font-medium">
            Sign in
          </button>{' '}
          to review it.
        </p>
      )}

      {loading && <p className="text-amber-600">Loading reviews...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && reviews.length === 0 && (
        <p className="text-amber-600">No reviews yet. Be the first to review this product!</p>
      )}

      <div className="space-y-4">
        {reviews.map((review) => (
          <ReviewCard
            key={review._id}
            review={review}
            onHelpful={handleHelpful}
            canVote={isAuthenticated && review.user?._id !== undefined}
          />
        ))}
      </div>
    </div>
  );
}

export default ReviewsSection;
