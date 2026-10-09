import mongoose from 'mongoose';

const donationSchema = new mongoose.Schema({
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 1 },
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  craftType: { type: String },
  message: { type: String, maxlength: 500 },
  paymentId: String,
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  isAnonymous: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Donation = mongoose.model('Donation', donationSchema);
export default Donation;
