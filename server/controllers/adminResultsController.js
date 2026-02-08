import Attempt from '../models/Attempt.js';
import Test from '../models/Test.js';
import AdminActivity from '../models/AdminActivity.js';
import { HttpError } from '../utils/httpError.js';

function toNum(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function computeScore(test, answers) {
  const qById = new Map(test.questions.map((q) => [q.id, q]));

  let score = 0;
  let maxScore = 0;

  for (const q of test.questions) {
    maxScore += typeof q.marks === 'number' ? q.marks : 1;
  }

  for (const a of answers || []) {
    const q = qById.get(a.questionId);
    if (!q) continue;

    const marks = typeof q.marks === 'number' ? q.marks : 1;

    if (!a.selectedOptionId) continue;

    if (a.selectedOptionId === q.correctOptionId) {
      score += marks;
    } else if (test.negativeMarkingEnabled) {
      score -= Number(test.negativeMarkPerQuestion || 0);
    }
  }

  score = Math.max(0, Math.round(score * 100) / 100);
  return { score, maxScore };
}

async function logActivity(adminId, type, message, meta = {}) {
  await AdminActivity.create({ adminId, type, message, meta });
}

export async function examResults(req, res, next) {
  try {
    const examId = req.params.examId;
    const q = req.query.q ? String(req.query.q).trim().toLowerCase() : '';
    const limit = Math.min(500, Math.max(1, toNum(req.query.limit, 200)));

    const exam = await Test.findById(examId).select('-questions');
    if (!exam) throw new HttpError('Exam not found', 404);

    const attempts = await Attempt.find({ testId: exam._id, submittedAt: { $ne: null } })
      .sort({ score: -1, timeTakenSeconds: 1, submittedAt: 1 })
      .limit(limit)
      .populate('userId', 'name email');

    let rows = attempts.map((a, idx) => ({
      attemptId: a._id,
      rank: idx + 1,
      user: a.userId ? { id: a.userId._id, name: a.userId.name, email: a.userId.email } : null,
      score: a.score,
      maxScore: a.maxScore,
      percent: a.maxScore ? Math.round((a.score / a.maxScore) * 10000) / 100 : 0,
      timeTakenSeconds: a.timeTakenSeconds,
      submittedAt: a.submittedAt,
      violationsCount: Array.isArray(a.violations) ? a.violations.length : 0,
      malpracticeStatus: a.malpracticeStatus || 'under_review',
    }));

    if (q) {
      rows = rows.filter((r) => {
        const name = r.user?.name ? String(r.user.name).toLowerCase() : '';
        const email = r.user?.email ? String(r.user.email).toLowerCase() : '';
        return name.includes(q) || email.includes(q);
      });
    }

    const stats = (() => {
      const total = rows.length;
      const avg = total ? rows.reduce((acc, r) => acc + (r.score || 0), 0) / total : 0;
      const best = total ? Math.max(...rows.map((r) => r.score || 0)) : 0;
      const worst = total ? Math.min(...rows.map((r) => r.score || 0)) : 0;
      const flagged = rows.filter((r) => (r.violationsCount || 0) > 0 || r.malpracticeStatus === 'disqualified').length;

      const buckets = [
        { label: '0-20', min: 0, max: 20, count: 0 },
        { label: '20-40', min: 20, max: 40, count: 0 },
        { label: '40-60', min: 40, max: 60, count: 0 },
        { label: '60-80', min: 60, max: 80, count: 0 },
        { label: '80-100', min: 80, max: 101, count: 0 },
      ];

      for (const r of rows) {
        const p = Number(r.percent || 0);
        const b = buckets.find((x) => p >= x.min && p < x.max);
        if (b) b.count += 1;
      }

      return {
        total,
        avgScore: Math.round(avg * 100) / 100,
        bestScore: best,
        worstScore: worst,
        flagged,
        buckets,
      };
    })();

    res.json({
      exam: {
        id: exam._id,
        title: exam.title,
        startAt: exam.startAt,
        endAt: exam.endAt,
        totalMarks: exam.totalMarks,
        passingMarks: exam.passingMarks,
        negativeMarkingEnabled: exam.negativeMarkingEnabled,
        negativeMarkPerQuestion: exam.negativeMarkPerQuestion,
        leaderboardEnabled: exam.leaderboardEnabled,
        leaderboardVisible: exam.leaderboardVisible,
      },
      stats,
      rows,
    });
  } catch (e) {
    if (String(e?.name || '').includes('CastError')) {
      next(new HttpError('Invalid exam id', 400));
      return;
    }
    next(e);
  }
}

export async function recalculateExam(req, res, next) {
  try {
    const examId = req.params.examId;
    const exam = await Test.findById(examId);
    if (!exam) throw new HttpError('Exam not found', 404);

    const attempts = await Attempt.find({ testId: exam._id, submittedAt: { $ne: null } });

    let changed = 0;
    for (const a of attempts) {
      const before = { score: a.score, maxScore: a.maxScore };
      const { score, maxScore } = computeScore(exam, a.answers);
      a.score = score;
      a.maxScore = maxScore;
      if (before.score !== score || before.maxScore !== maxScore) changed += 1;
      await a.save();
    }

    await logActivity(req.admin._id, 'RESULTS_RECALCULATED', `Results recalculated: ${exam.title}`, {
      examId: exam._id,
      totalAttempts: attempts.length,
      changed,
    });

    res.json({ ok: true, totalAttempts: attempts.length, changed });
  } catch (e) {
    if (String(e?.name || '').includes('CastError')) {
      next(new HttpError('Invalid exam id', 400));
      return;
    }
    next(e);
  }
}

export async function updateLeaderboard(req, res, next) {
  try {
    const examId = req.params.examId;
    const exam = await Test.findById(examId);
    if (!exam) throw new HttpError('Exam not found', 404);

    if ('leaderboardEnabled' in req.body) {
      exam.leaderboardEnabled = Boolean(req.body.leaderboardEnabled);
    }
    if ('leaderboardVisible' in req.body) {
      exam.leaderboardVisible = Boolean(req.body.leaderboardVisible);
    }

    await exam.save();

    await logActivity(req.admin._id, 'LEADERBOARD_UPDATED', `Leaderboard updated: ${exam.title}`, {
      examId: exam._id,
      leaderboardEnabled: exam.leaderboardEnabled,
      leaderboardVisible: exam.leaderboardVisible,
    });

    res.json({
      exam: {
        id: exam._id,
        leaderboardEnabled: exam.leaderboardEnabled,
        leaderboardVisible: exam.leaderboardVisible,
      },
    });
  } catch (e) {
    if (String(e?.name || '').includes('CastError')) {
      next(new HttpError('Invalid exam id', 400));
      return;
    }
    next(e);
  }
}
