import Attempt from '../models/Attempt.js';
import Test from '../models/Test.js';

export async function userAnalysis(req, res, next) {
  try {
    const attempts = await Attempt.find({ userId: req.user._id, submittedAt: { $ne: null } })
      .sort({ submittedAt: 1 })
      .select('testId score maxScore submittedAt');

    const testIds = attempts.map((a) => a.testId);
    const tests = await Test.find({ _id: { $in: testIds } }).select('title');
    const testTitleById = new Map(tests.map((t) => [t._id.toString(), t.title]));

    const trend = attempts.map((a) => ({
      label: testTitleById.get(a.testId.toString()) || 'Test',
      score: a.score,
      maxScore: a.maxScore,
      accuracy: a.maxScore ? Math.round((a.score / a.maxScore) * 100) : 0,
      submittedAt: a.submittedAt,
    }));

    const total = attempts.length;
    const avgAccuracy =
      total === 0
        ? 0
        : Math.round(trend.reduce((acc, t) => acc + t.accuracy, 0) / total);

    res.json({
      stats: {
        attemptedCount: total,
        avgAccuracy,
      },
      trend,
    });
  } catch (e) {
    next(e);
  }
}
