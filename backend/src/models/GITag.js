import mongoose from 'mongoose';

const giTagSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  description: { type: String, required: true },
  location: {
    state: { type: String, required: true },
    district: String,
    region: String
  },
  products: [{ type: String }],
  artisans: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Artisan' }],
  history: { type: String },
  significance: { type: String },
  technique: { type: String },
  images: [{ type: String }],
  wikipediaUrl: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

giTagSchema.index({ name: 'text', description: 'text' });
giTagSchema.index({ 'location.state': 1 });

const GITag = mongoose.model('GITag', giTagSchema);
export default GITag;
