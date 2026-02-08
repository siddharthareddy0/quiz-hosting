import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: 'Admin' },
    email: { type: String, trim: true, lowercase: true, unique: true, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'admin' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Admin', adminSchema);
