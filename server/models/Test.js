import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    prompt: { type: String, required: true },
    options: { type: [optionSchema], required: true },
    correctOptionId: { type: String, required: true },
    marks: { type: Number, default: 1 },
    explanation: { type: String, default: '' },
  },
  { _id: false }
);

const testSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    instructions: { type: String, default: '' },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true },

    published: { type: Boolean, default: true },
    publishedAt: { type: Date, default: null },

    totalMarks: { type: Number, default: 0 },
    passingMarks: { type: Number, default: 0 },
    negativeMarkingEnabled: { type: Boolean, default: false },
    negativeMarkPerQuestion: { type: Number, default: 0 },
    lateEntryBlocked: { type: Boolean, default: false },

    leaderboardEnabled: { type: Boolean, default: true },
    leaderboardVisible: { type: Boolean, default: true },
    answerKeyVisible: { type: Boolean, default: true },

    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },

    assignmentMode: { type: String, enum: ['all', 'selected'], default: 'all' },
    assignedUserIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },

    questions: { type: [questionSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('Test', testSchema);
