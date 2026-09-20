import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  verificationOtpHash: { type: String, select: false },
  verificationOtpExpires: { type: Date, select: false },
  verificationOtpAttempts: { type: Number, default: 0, select: false },
  verificationOtpLastSent: { type: Date, select: false },
  resetOtpHash: { type: String, select: false },
  resetOtpExpires: { type: Date, select: false },
  resetOtpAttempts: { type: Number, default: 0, select: false },
  resetOtpLastSent: { type: Date, select: false },
}, { timestamps: true });

userSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
