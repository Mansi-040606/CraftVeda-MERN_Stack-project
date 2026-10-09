import mongoose from 'mongoose';

const craftStorySchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  excerpt: { type: String, maxlength: 300 },
  coverImage: { type: String },
  category: { 
    type: String, 
    enum: ['history', 'technique', 'artisan-story', 'heritage', 'preservation', 'other'],
    default: 'heritage'
  },
  craftType: { type: String },
  region: { type: String },
  featured: { type: Boolean, default: false },
  publishedAt: { type: Date },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tags: [{ type: String }],
  readTime: { type: Number },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

craftStorySchema.index({ slug: 1 });
craftStorySchema.index({ category: 1 });
craftStorySchema.index({ featured: 1 });

const CraftStory = mongoose.model('CraftStory', craftStorySchema);
export default CraftStory;
