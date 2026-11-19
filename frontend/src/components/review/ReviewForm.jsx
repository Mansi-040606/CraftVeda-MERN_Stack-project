import { useState } from 'react';
import StarRating from './StarRating';
import { reviewService } from '../../services/reviewService';
import { errMsg, toast } from '../Toast';

// "Write a review" form. Rendered by ProductDetail only when the server
// said reviewability.allowed === true.
function ReviewForm({ productId, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const commentTooShort = comment.trim().length > 0 && comment.trim().length < 5;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (rating < 1) return toast.error('Please choose a star rating');
    if (comment.trim().length < 5) return toast.error('Please write at least 5 characters');

    setSubmitting(true);
    try {
      await reviewService.create({
        product: productId,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
      });
      toast.success('Review posted — thank you!');
      setRating(0);
      setTitle('');
      setComment('');
      onSubmitted?.();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to post review'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-ink/10 rounded-sm p-5 space-y-4">
      <h3 className="font-bold text-ink">Write a Review</h3>

      <div className="flex items-center gap-3">
        <span className="text-sm text-ink-soft font-medium">Your rating:</span>
        <StarRating value={rating} onChange={setRating} size="text-2xl" />
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={100}
        placeholder="Title (optional)"
        className="w-full border border-ink/15 rounded-sm px-3 py-2 text-ink placeholder-ink-faint focus:outline-none focus:border-terracotta"
      />

      <div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={4}
          placeholder="Share your experience with this product (5–1000 characters)"
          className={`w-full border rounded-sm px-3 py-2 text-ink placeholder-ink-faint focus:outline-none focus:border-terracotta ${
            commentTooShort ? 'border-red-400' : 'border-ink/15'
          }`}
        />
        {commentTooShort && (
          <p className="text-xs text-red-600 mt-1">Comment must be at least 5 characters.</p>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting || rating < 1 || comment.trim().length < 5}
        className="bg-terracotta text-white px-6 py-2 rounded-sm hover:bg-terracotta-dark transition font-semibold disabled:bg-linen disabled:cursor-not-allowed"
      >
        {submitting ? 'Posting...' : 'Post Review'}
      </button>
    </form>
  );
}

export default ReviewForm;
