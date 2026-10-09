import mongoose from 'mongoose';

const workshopSchema = new mongoose.Schema({
  artisan: { type: mongoose.Schema.Types.ObjectId, ref: 'Artisan', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  craftType: { type: String, required: true },
  duration: { type: Number, required: true },
  durationUnit: { type: String, enum: ['minutes', 'hours', 'days'], default: 'hours' },
  maxParticipants: { type: Number, required: true, min: 1 },
  currentParticipants: { type: Number, default: 0 },
  price: { type: Number, required: true, min: 0 },
  images: [{ type: String }],
  videoUrl: { type: String },
  schedule: [{
    date: Date,
    startTime: String,
    endTime: String,
    isBooked: { type: Boolean, default: false }
  }],
  materials: [{ name: String, description: String }],
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'all'], default: 'all' },
  language: { type: String, default: 'English' },
  location: {
    type: { type: String, enum: ['online', 'offline', 'hybrid'], default: 'online' },
    address: String,
    city: String,
    state: String
  },
  isActive: { type: Boolean, default: true },
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Workshop = mongoose.model('Workshop', workshopSchema);
export default Workshop;
