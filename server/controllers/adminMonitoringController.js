import Attempt from '../models/Attempt.js';
import Test from '../models/Test.js';
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

function lastActivity(attempt) {
  const candidates = [attempt?.updatedAt, attempt?.submittedAt, attempt?.startedAt]
    .filter(Boolean)
    .map((d) => new Date(d));

  const lastViolationAt = Array.isArray(attempt?.violations) && attempt.violations.length
    ? new Date(
        attempt.violations.reduce((max, v) => {
          const t = v?.at ? new Date(v.at).getTime() : 0;
          return t > max ? t : max;
        }, 0)
      )
    : null;

  if (lastViolationAt && Number.isFinite(lastViolationAt.getTime())) candidates.push(lastViolationAt);

  if (!candidates.length) return null;
  return new Date(Math.max(...candidates.map((d) => d.getTime())));
}

export async function liveMonitoring(req, res, next) {
  try {
    const now = new Date();

    const examId = req.query.examId ? String(req.query.examId) : '';
    const q = req.query.q ? String(req.query.q).trim() : '';
    const riskMin = toNum(req.query.riskMin, 0);
    const limit = Math.min(300, Math.max(1, toNum(req.query.limit, 200)));

    const attemptQuery = {};
    if (examId) attemptQuery.testId = examId;

    const attempts = await Attempt.find(attemptQuery)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .populate('userId', 'name email')
      .populate('testId', 'title startAt endAt');

    let rows = attempts.map((a) => {
      const riskScore = computeRisk(a.violations);
      const lastActivityAt = lastActivity(a);

      const status = a.submittedAt
        ? 'submitted'
        : a.startedAt
          ? 'in_progress'
          : 'not_started';

      const activeWindow = a.testId?.startAt && a.testId?.endAt
        ? now >= new Date(a.testId.startAt) && now <= new Date(a.testId.endAt)
        : false;

      const lastActivityMs = lastActivityAt ? now.getTime() - lastActivityAt.getTime() : Infinity;
      const presence = status === 'in_progress' && activeWindow && lastActivityMs <= 2 * 60 * 1000
        ? 'active'
        : status === 'in_progress'
          ? 'idle'
          : status;

      return {
        attemptId: a._id,
        exam: a.testId
          ? {
              id: a.testId._id,
              title: a.testId.title,
              startAt: a.testId.startAt,
              endAt: a.testId.endAt,
            }
          : null,
        user: a.userId
          ? {
              id: a.userId._id,
              name: a.userId.name,
              email: a.userId.email,
            }
          : null,
        status,
        presence,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
        lastActivityAt,
        violationsCount: Array.isArray(a.violations) ? a.violations.length : 0,
        riskScore,
        lastViolation: Array.isArray(a.violations) && a.violations.length
          ? (() => {
              const last = a.violations.reduce((acc, v) => {
                const t = v?.at ? new Date(v.at).getTime() : 0;
                if (!acc) return v;
                const accT = acc?.at ? new Date(acc.at).getTime() : 0;
                return t >= accT ? v : acc;
              }, null);
              return last
                ? {
                    type: last.type,
                    at: last.at,
                    meta: last.meta || {},
                  }
                : null;
            })()
          : null,
      };
    });

    if (q) {
      const qLower = q.toLowerCase();
      rows = rows.filter((r) => {
        const name = r.user?.name ? String(r.user.name).toLowerCase() : '';
        const email = r.user?.email ? String(r.user.email).toLowerCase() : '';
        return name.includes(qLower) || email.includes(qLower);
      });
    }

    if (Number.isFinite(riskMin) && riskMin > 0) {
      rows = rows.filter((r) => r.riskScore >= riskMin);
    }

    if (!examId) {
      const examIds = Array.from(new Set(rows.map((r) => r.exam?.id?.toString()).filter(Boolean)));
      const exams = await Test.find({ _id: { $in: examIds } })
        .select('title startAt endAt')
        .sort({ startAt: -1 });

      res.json({
        serverTime: now,
        exams: exams.map((e) => ({ id: e._id, title: e.title, startAt: e.startAt, endAt: e.endAt })),
        rows,
      });
      return;
    }

    res.json({ serverTime: now, rows });
  } catch (e) {
    if (String(e?.name || '').includes('CastError')) {
      next(new HttpError('Invalid exam id', 400));
      return;
    }
    next(e);
  }
}
