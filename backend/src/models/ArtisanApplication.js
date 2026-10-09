import mongoose from 'mongoose';

const artisanApplicationSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true
  },
  businessName: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  craftTypes: [{ type: String, required: true }],
  skills: [{ type: String }],
  yearsOfExperience: { type: Number, required: true },
  location: {
    address: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  portfolio: { type: String },
  status: { 
    type: String, 
    enum: ['PENDING', 'APPROVED', 'REJECTED'], 
    default: 'PENDING' 
  },
  adminNotes: { type: String },
  reviewedAt: { type: Date },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

artisanApplicationSchema.index({ status: 1 });
artisanApplicationSchema.index({ user: 1 });

const ArtisanApplication = mongoose.model('ArtisanApplication', artisanApplicationSchema);
export default ArtisanApplication;