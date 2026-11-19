import StarRating from './StarRating';

const shortDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// One review entry: avatar, stars, title, comment, verified badge, helpful vote.
function ReviewCard({ review, onHelpful, canVote }) {
  const name = review.user?.name || 'Anonymous';
  const initial = name.charAt(0).toUpperCase();
  const avatar = review.user?.avatar;

  return (
    <div className="border border-ink/10 rounded-sm p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {avatar ? (
            <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <span className="w-10 h-10 rounded-full bg-terracotta text-white flex items-center justify-center font-semibold">
              {initial}
            </span>
          )}
          <div>
            <p className="font-semibold text-ink">{name}</p>
            <p className="text-xs text-ink-soft">{shortDate(review.createdAt)}</p>
          </div>
        </div>
        <StarRating value={review.rating} size="text-base" />
      </div>

      {review.title && <h4 className="font-semibold text-ink mt-3">{review.title}</h4>}
      <p className="text-ink-soft mt-2 leading-relaxed">{review.comment}</p>

      {review.images?.length > 0 && (
        <div className="flex gap-2 mt-3">
          {review.images.map((src, idx) => (
            <img key={idx} src={src} alt="" className="w-16 h-16 rounded-sm object-cover border border-ink/10" />
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 mt-4 text-sm">
        {review.isVerifiedPurchase && (
          <span className="text-green-700 font-medium">✓ Verified Purchase</span>
        )}
        {typeof review.helpful === 'number' && review.helpful > 0 && (
          <span className="text-ink-soft">Helpful ({review.helpful})</span>
        )}
        {onHelpful && canVote && (
          <button
            onClick={() => onHelpful(review._id)}
            className="text-terracotta-dark hover:text-ink font-medium underline"
          >
            Mark helpful
          </button>
        )}
      </div>
    </div>
  );
}

export default ReviewCard;
