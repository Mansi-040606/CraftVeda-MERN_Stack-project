import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  phone: { type: String },
  role: { type: String, enum: ['CUSTOMER', 'ARTISAN', 'ADMIN'], default: 'CUSTOMER' },
  status: { type: String, enum: ['ACTIVE', 'PENDING', 'BLOCKED'], default: 'ACTIVE' },
  avatar: { type: String },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  cart: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 1 }
  }],
  // Google sub (subject) id — sparse unique so the many users without it are
  // not indexed and existing documents keep working untouched.
  googleId: { type: String, unique: true, sparse: true },
  // Password reset: a single-use random token (stored HASHED) plus the OTP
  // state for the forgot-password flow. The OTP itself is never stored —
  // only an HMAC-SHA256 of it, keyed with JWT_SECRET.
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  passwordResetOtpHash: String,
  passwordResetOtpExpires: Date,
  passwordResetOtpAttempts: { type: Number, default: 0 },
  passwordResetOtpLastSentAt: Date,
  passwordResetOtpWindowStart: Date,
  passwordResetOtpRequestCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
