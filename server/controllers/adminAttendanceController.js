import Attempt from '../models/Attempt.js';
import Test from '../models/Test.js';
import User from '../models/User.js';
import { HttpError } from '../utils/httpError.js';

function toNum(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function attendanceRows(req, res, next) {
  try {
    const examId = req.query.examId ? String(req.query.examId) : '';
    if (!examId) throw new HttpError('examId is required', 400);

    const q = req.query.q ? String(req.query.q).trim() : '';
    const limit = Math.min(1000, Math.max(1, toNum(req.query.limit, 500)));

    const exam = await Test.findById(examId).select('title assignmentMode assignedUserIds startAt endAt');
    if (!exam) throw new HttpError('Exam not found', 404);

    const userFilter = (() => {
      if (exam.assignmentMode === 'selected') {
        const ids = (exam.assignedUserIds || []).map((x) => x.toString());
        return { _id: { $in: ids } };
      }
      return {};
    })();

    const searchFilter = q
      ? {
          $or: [
            { email: { $regex: q, $options: 'i' } },
            { name: { $regex: q, $options: 'i' } },
          ],
        }
      : {};

    const users = await User.find({ ...userFilter, ...searchFilter })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('_id name email createdAt');

    const userIds = users.map((u) => u._id);

    const attempts = await Attempt.find({ testId: exam._id, userId: { $in: userIds } })
      .select('userId startedAt submittedAt violations updatedAt malpracticeStatus')
      .sort({ updatedAt: -1 });

    const byUser = new Map();
    for (const a of attempts) {
      byUser.set(a.userId.toString(), a);
    }

    const rows = users.map((u) => {
      const a = byUser.get(u._id.toString());
      const started = a?.startedAt || null;
      const submitted = a?.submittedAt || null;
      const status = submitted ? 'submitted' : started ? 'present' : 'absent';

      return {
        user: { id: u._id, name: u.name, email: u.email },
        status,
        startedAt: started,
        submittedAt: submitted,
        lastActivityAt: a?.updatedAt || null,
        violationsCount: Array.isArray(a?.violations) ? a.violations.length : 0,
        malpracticeStatus: a?.malpracticeStatus || 'under_review',
      };
    });

    const summary = rows.reduce(
      (acc, r) => {
        acc.total += 1;
        if (r.status === 'present') acc.present += 1;
        if (r.status === 'submitted') acc.submitted += 1;
        if (r.status === 'absent') acc.absent += 1;
        return acc;
      },
      { total: 0, present: 0, submitted: 0, absent: 0 }
    );

    res.json({
      exam: {
        id: exam._id,
        title: exam.title,
        assignmentMode: exam.assignmentMode,
        startAt: exam.startAt,
        endAt: exam.endAt,
      },
      summary,
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
