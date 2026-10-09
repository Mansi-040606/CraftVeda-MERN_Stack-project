import mongoose from 'mongoose';

const artisanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  businessName: { type: String, required: true },
  description: { type: String, required: true },
  story: { type: String },
  profileImage: { type: String },
  coverImage: { type: String },
  craftTypes: [{ type: String, required: true }],
  skills: [{ type: String }],
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
    address: String,
    city: String,
    state: String,
    pincode: String
  },
  giTag: { type: mongoose.Schema.Types.ObjectId, ref: 'GITag' },
  yearsOfExperience: { type: Number },
  awards: [{ title: String, year: Number, description: String }],
  socialLinks: {
    instagram: String,
    facebook: String,
    website: String
  },
  bankDetails: {
    accountHolder: String,
    accountNumber: String,
    ifsc: String,
    bankName: String
  },
  isVerified: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  totalProducts: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

artisanSchema.index({ location: '2dsphere' });
artisanSchema.index({ craftTypes: 1 });
artisanSchema.index({ city: 1, state: 1 });

const Artisan = mongoose.model('Artisan', artisanSchema);
export default Artisan;
