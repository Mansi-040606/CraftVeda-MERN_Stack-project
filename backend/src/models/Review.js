import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  workshop: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop' },
  artisan: { type: mongoose.Schema.Types.ObjectId, ref: 'Artisan' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, maxlength: 100 },
  comment: { type: String, maxlength: 1000 },
  images: [{ type: String }],
  isVerifiedPurchase: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: true },
  helpful: { type: Number, default: 0 },
  helpfulBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ artisan: 1 });
reviewSchema.index({ rating: -1 });
// One review per user per product, enforced at the DB level as well as in the
// controller. partialFilterExpression leaves workshop-only reviews (product
// null) unconstrained. Verified safe: craftveda and craftveda_dev had 0
// reviews (hence 0 duplicate pairs) before this index was added.
reviewSchema.index(
  { user: 1, product: 1 },
  { unique: true, partialFilterExpression: { product: { $type: 'objectId' } } }
);

const Review = mongoose.model('Review', reviewSchema);
export default Review;
