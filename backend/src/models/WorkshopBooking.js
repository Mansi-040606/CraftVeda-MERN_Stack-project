import mongoose from 'mongoose';

const workshopBookingSchema = new mongoose.Schema({
  workshop: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduleDate: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  participants: { type: Number, default: 1 },
  amount: { type: Number, required: true },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentId: String,
  status: { 
    type: String, 
    enum: ['booked', 'confirmed', 'completed', 'cancelled'],
    default: 'booked'
  },
  joinLink: { type: String },
  materialsSent: { type: Boolean, default: false },
  feedback: {
    rating: Number,
    comment: String
  },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

workshopBookingSchema.index({ workshop: 1, scheduleDate: 1 });
workshopBookingSchema.index({ user: 1 });

const WorkshopBooking = mongoose.model('WorkshopBooking', workshopBookingSchema);
export default WorkshopBooking;
