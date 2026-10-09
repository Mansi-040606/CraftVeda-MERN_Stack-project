import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  artisan: { type: mongoose.Schema.Types.ObjectId, ref: 'Artisan', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  certificateNumber: { type: String, required: true, unique: true },
  qrCode: { type: String },
  issuedAt: { type: Date, default: Date.now },
  authenticityHash: { type: String },
  craftDetails: {
    craftType: String,
    material: String,
    technique: String,
    origin: String
  },
  isValid: { type: Boolean, default: true }
}, { timestamps: true });

certificateSchema.index({ certificateNumber: 1 });
certificateSchema.index({ qrCode: 1 });

const Certificate = mongoose.model('Certificate', certificateSchema);
export default Certificate;
