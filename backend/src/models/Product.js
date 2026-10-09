import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  images: [{ type: String }],
  category: { 
    type: String, 
    required: true,
    enum: ['textiles', 'pottery', 'jewelry', 'woodwork', 'metalwork', 'painting', 'sculpture', 'embroidery', 'other']
  },
  craftType: { type: String, required: true },
  material: { type: String },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: { type: String, default: 'cm' }
  },
  weight: { type: Number, unit: String },
  color: [{ type: String }],
  stock: { type: Number, default: 1, min: 0 },
  artisan: { type: mongoose.Schema.Types.ObjectId, ref: 'Artisan', required: true },
  giTag: { type: mongoose.Schema.Types.ObjectId, ref: 'GITag' },
  isCustomizable: { type: Boolean, default: false },
  customizationOptions: [{
    name: String,
    options: [String],
    additionalPrice: Number
  }],
  tags: [{ type: String }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

productSchema.index({ name: 'text', description: 'text', craftType: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ artisan: 1 });
productSchema.index({ price: 1 });

const Product = mongoose.model('Product', productSchema);
export default Product;
