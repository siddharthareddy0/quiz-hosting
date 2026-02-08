import Attempt from '../models/Attempt.js';
import AdminActivity from '../models/AdminActivity.js';
import { HttpError } from '../utils/httpError.js';

function toNum(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function computeRisk(violations) {
  if (!Array.isArray(violations) || violations.length === 0) return 0;

  let score = 0;
  for (const v of violations) {
    const type = String(v?.type || 'unknown');
    if (type.includes('TAB') || type.includes('BLUR')) score += 15;
    else if (type.includes('FULLSCREEN')) score += 25;
    else if (type.includes('COPY') || type.includes('PASTE')) score += 35;
    else score += 10;
  }

  return Math.min(100, score);
}

function safeDate(d) {
  if (!d) return null;
  const dd = new Date(d);
  if (Number.isNaN(dd.getTime())) return null;
  return dd;
}

function lastViolation(violations) {
  if (!Array.isArray(violations) || violations.length === 0) return null;
  return violations.reduce((acc, v) => {
    if (!acc) return v;
    const at = v?.at ? new Date(v.at).getTime() : 0;
    const accAt = acc?.at ? new Date(acc.at).getTime() : 0;
    return at >= accAt ? v : acc;
  }, null);
}

async function logActivity(adminId, type, message, meta = {}) {
  await AdminActivity.create({ adminId, type, message, meta });
}

export async function listMalpracticeCases(req, res, next) {
  try {
    const examId = req.query.examId ? String(req.query.examId) : '';
    const q = req.query.q ? String(req.query.q).trim().toLowerCase() : '';
    const status = req.query.status ? String(req.query.status) : '';
    const riskMin = toNum(req.query.riskMin, 0);
    const limit = Math.min(300, Math.max(1, toNum(req.query.limit, 200)));

    const query = { 'violations.0': { $exists: true } };
    if (examId) query.testId = examId;
    if (status && ['under_review', 'approved', 'disqualified'].includes(status)) {
      query.malpracticeStatus = status;
    }

    const attempts = await Attempt.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .populate('userId', 'name email')
      .populate('testId', 'title startAt endAt');

    let cases = attempts.map((a) => {
      const riskScore = computeRisk(a.violations);
      const last = lastViolation(a.violations);
      const statusValue = a.malpracticeStatus || 'under_review';

      return {
        attemptId: a._id,
        exam: a.testId
          ? { id: a.testId._id, title: a.testId.title, startAt: a.testId.startAt, endAt: a.testId.endAt }
          : null,
        user: a.userId ? { id: a.userId._id, name: a.userId.name, email: a.userId.email } : null,
        malpracticeStatus: statusValue,
        decisionAt: safeDate(a.malpracticeDecisionAt),
        decidedByAdminId: a.malpracticeDecidedByAdminId || null,
        decisionNote: a.malpracticeDecisionNote || '',
        startedAt: safeDate(a.startedAt),
        submittedAt: safeDate(a.submittedAt),
        updatedAt: safeDate(a.updatedAt),
        violationsCount: Array.isArray(a.violations) ? a.violations.length : 0,
        riskScore,
        lastViolation: last
          ? {
              type: last.type,
              at: last.at,
              meta: last.meta || {},
            }
          : null,
        violations: (a.violations || []).slice().sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime()),
      };
    });

    if (q) {
      cases = cases.filter((c) => {
        const name = c.user?.name ? String(c.user.name).toLowerCase() : '';
        const email = c.user?.email ? String(c.user.email).toLowerCase() : '';
        return name.includes(q) || email.includes(q);
      });
    }

    if (Number.isFinite(riskMin) && riskMin > 0) {
      cases = cases.filter((c) => c.riskScore >= riskMin);
    }

    res.json({ cases });
  } catch (e) {
    if (String(e?.name || '').includes('CastError')) {
      next(new HttpError('Invalid id', 400));
      return;
    }
    next(e);
  }
}

export async function updateMalpracticeStatus(req, res, next) {
  try {
    const status = req.body?.status;
    const note = req.body?.note ? String(req.body.note).slice(0, 500) : '';

    if (!['under_review', 'approved', 'disqualified'].includes(status)) {
      throw new HttpError('Invalid status', 400);
    }

    const attempt = await Attempt.findById(req.params.attemptId).populate('testId', 'title');
    if (!attempt) throw new HttpError('Attempt not found', 404);

    attempt.malpracticeStatus = status;
    attempt.malpracticeDecisionAt = new Date();
    attempt.malpracticeDecidedByAdminId = req.admin._id;
    attempt.malpracticeDecisionNote = note;

    await attempt.save();

    await logActivity(
      req.admin._id,
      'MALPRACTICE_DECISION',
      `Malpractice decision set to ${status}: ${attempt.testId?.title || 'Exam'}`,
      {
        attemptId: attempt._id,
        examId: attempt.testId?._id,
        status,
      }
    );

    res.json({ ok: true });
  } catch (e) {
    if (String(e?.name || '').includes('CastError')) {
      next(new HttpError('Invalid attempt id', 400));
      return;
    }
    next(e);
  }
}
