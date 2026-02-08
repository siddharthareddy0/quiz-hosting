import Attempt from '../models/Attempt.js';
import Test from '../models/Test.js';
import User from '../models/User.js';
import AdminActivity from '../models/AdminActivity.js';

export async function dashboardStats(req, res, next) {
  try {
    const now = new Date();

    const [
      totalExams,
      upcomingExams,
      activeExams,
      completedExams,
      totalUsers,
      attempts,
    ] = await Promise.all([
      Test.countDocuments({}),
      Test.countDocuments({ startAt: { $gt: now } }),
      Test.countDocuments({ startAt: { $lte: now }, endAt: { $gte: now } }),
      Test.countDocuments({ endAt: { $lt: now } }),
      User.countDocuments({}),
      Attempt.find({ submittedAt: { $ne: null } }).select('testId score maxScore'),
    ]);

    const avgScorePerExam = (() => {
      if (!attempts.length) return 0;
      const byTest = new Map();
      for (const a of attempts) {
        const id = a.testId.toString();
        const cur = byTest.get(id) || { sum: 0, count: 0 };
        cur.sum += a.score;
        cur.count += 1;
        byTest.set(id, cur);
      }
      const avgs = Array.from(byTest.values()).map((x) => x.sum / x.count);
      const overall = avgs.reduce((acc, v) => acc + v, 0) / (avgs.length || 1);
      return Math.round(overall * 100) / 100;
    })();

    const recentActivity = await AdminActivity.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('adminId', 'name email');

    res.json({
      stats: {
        totalExams,
        upcomingExams,
        activeExams,
        completedExams,
        totalUsers,
        avgScorePerExam,
      },
      recentActivity: recentActivity.map((a) => ({
        id: a._id,
        type: a.type,
        message: a.message,
        at: a.createdAt,
        admin: a.adminId ? { id: a.adminId._id, name: a.adminId.name || a.adminId.email } : null,
      })),
    });
  } catch (e) {
    next(e);
  }
}
