import mongoose from 'mongoose';

const adminActivitySchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    type: { type: String, required: true },
    message: { type: String, required: true },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model('AdminActivity', adminActivitySchema);
