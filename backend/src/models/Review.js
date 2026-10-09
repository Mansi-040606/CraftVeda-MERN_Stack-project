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

const Review = mongoose.model('Review', reviewSchema);
export default Review;
