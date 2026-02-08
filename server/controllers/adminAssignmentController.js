import AdminActivity from '../models/AdminActivity.js';
import Test from '../models/Test.js';
import { HttpError } from '../utils/httpError.js';

async function logActivity(adminId, type, message, meta = {}) {
  await AdminActivity.create({ adminId, type, message, meta });
}

export async function getAssignments(req, res, next) {
  try {
    const exam = await Test.findById(req.params.examId).select('title assignmentMode assignedUserIds');
    if (!exam) throw new HttpError('Exam not found', 404);

    res.json({
      exam: {
        id: exam._id,
        title: exam.title,
        assignmentMode: exam.assignmentMode || 'all',
        assignedUserIds: exam.assignedUserIds || [],
      },
    });
  } catch (e) {
    next(e);
  }
}

export async function updateAssignments(req, res, next) {
  try {
    const exam = await Test.findById(req.params.examId);
    if (!exam) throw new HttpError('Exam not found', 404);

    const mode = req.body?.assignmentMode;
    if (mode && !['all', 'selected'].includes(mode)) {
      throw new HttpError('Invalid assignment mode', 400);
    }

    if (mode) exam.assignmentMode = mode;

    if (Array.isArray(req.body?.assignedUserIds)) {
      exam.assignedUserIds = req.body.assignedUserIds;
    }

    await exam.save();

    await logActivity(req.admin._id, 'ASSIGNMENTS_UPDATED', `Assignments updated: ${exam.title}`, {
      examId: exam._id,
      assignmentMode: exam.assignmentMode,
      assignedCount: exam.assignedUserIds?.length || 0,
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}
