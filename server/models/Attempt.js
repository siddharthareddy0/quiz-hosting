import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    selectedOptionId: { type: String, default: null },
    markedForReview: { type: Boolean, default: false },
    visited: { type: Boolean, default: false },
  },
  { _id: false }
);

const violationSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    at: { type: Date, required: true },
    meta: { type: Object, default: {} },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
    startedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    timeTakenSeconds: { type: Number, default: 0 },
    answers: { type: [answerSchema], default: [] },
    violations: { type: [violationSchema], default: [] },
    malpracticeStatus: {
      type: String,
      enum: ['under_review', 'approved', 'disqualified'],
      default: 'under_review',
    },
    malpracticeDecisionAt: { type: Date, default: null },
    malpracticeDecidedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    malpracticeDecisionNote: { type: String, default: '' },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

attemptSchema.index({ userId: 1, testId: 1 }, { unique: true });

export default mongoose.model('Attempt', attemptSchema);
