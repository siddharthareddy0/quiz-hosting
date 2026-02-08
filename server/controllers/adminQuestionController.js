import AdminActivity from '../models/AdminActivity.js';
import Test from '../models/Test.js';
import { HttpError } from '../utils/httpError.js';

function requireExam(exam) {
  if (!exam) throw new HttpError('Exam not found', 404);
}

async function logActivity(adminId, type, message, meta = {}) {
  await AdminActivity.create({ adminId, type, message, meta });
}

export async function listQuestions(req, res, next) {
  try {
    const exam = await Test.findById(req.params.examId).select('title questions shuffleQuestions shuffleOptions');
    requireExam(exam);

    res.json({
      exam: {
        id: exam._id,
        title: exam.title,
        shuffleQuestions: Boolean(exam.shuffleQuestions),
        shuffleOptions: Boolean(exam.shuffleOptions),
      },
      questions: exam.questions,
    });
  } catch (e) {
    next(e);
  }
}

export async function updateQuestionSettings(req, res, next) {
  try {
    const exam = await Test.findById(req.params.examId);
    requireExam(exam);

    if (typeof req.body.shuffleQuestions === 'boolean') {
      exam.shuffleQuestions = req.body.shuffleQuestions;
    }
    if (typeof req.body.shuffleOptions === 'boolean') {
      exam.shuffleOptions = req.body.shuffleOptions;
    }

    await exam.save();

    await logActivity(req.admin._id, 'QUESTIONS_SETTINGS', `Question settings updated: ${exam.title}`, {
      examId: exam._id,
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function addQuestion(req, res, next) {
  try {
    const exam = await Test.findById(req.params.examId);
    requireExam(exam);

    const q = req.body;
    if (!q?.prompt || !Array.isArray(q.options) || !q.correctOptionId) {
      throw new HttpError('Invalid question payload', 400);
    }

    const next = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      prompt: q.prompt,
      options: q.options,
      correctOptionId: q.correctOptionId,
      marks: typeof q.marks === 'number' ? q.marks : Number(q.marks ?? 1),
      explanation: q.explanation || '',
    };

    exam.questions.push(next);
    await exam.save();

    await logActivity(req.admin._id, 'QUESTION_ADDED', `Question added: ${exam.title}`, {
      examId: exam._id,
      questionId: next.id,
    });

    res.status(201).json({ question: next });
  } catch (e) {
    next(e);
  }
}

export async function updateQuestion(req, res, next) {
  try {
    const exam = await Test.findById(req.params.examId);
    requireExam(exam);

    const idx = exam.questions.findIndex((x) => x.id === req.params.questionId);
    if (idx === -1) throw new HttpError('Question not found', 404);

    const payload = req.body;
    const cur = exam.questions[idx];

    exam.questions[idx] = {
      ...cur,
      prompt: payload.prompt ?? cur.prompt,
      options: Array.isArray(payload.options) ? payload.options : cur.options,
      correctOptionId: payload.correctOptionId ?? cur.correctOptionId,
      marks: payload.marks ?? cur.marks,
      explanation: payload.explanation ?? cur.explanation,
    };

    await exam.save();

    await logActivity(req.admin._id, 'QUESTION_EDITED', `Question edited: ${exam.title}`, {
      examId: exam._id,
      questionId: req.params.questionId,
    });

    res.json({ question: exam.questions[idx] });
  } catch (e) {
    next(e);
  }
}

export async function deleteQuestion(req, res, next) {
  try {
    const exam = await Test.findById(req.params.examId);
    requireExam(exam);

    const before = exam.questions.length;
    exam.questions = exam.questions.filter((x) => x.id !== req.params.questionId);
    if (exam.questions.length === before) throw new HttpError('Question not found', 404);

    await exam.save();

    await logActivity(req.admin._id, 'QUESTION_DELETED', `Question deleted: ${exam.title}`, {
      examId: exam._id,
      questionId: req.params.questionId,
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function reorderQuestions(req, res, next) {
  try {
    const exam = await Test.findById(req.params.examId);
    requireExam(exam);

    const orderedIds = req.body?.orderedIds;
    if (!Array.isArray(orderedIds) || orderedIds.length !== exam.questions.length) {
      throw new HttpError('Invalid order payload', 400);
    }

    const map = new Map(exam.questions.map((q) => [q.id, q]));
    const reordered = orderedIds.map((id) => map.get(id)).filter(Boolean);

    if (reordered.length !== exam.questions.length) {
      throw new HttpError('Invalid order payload', 400);
    }

    exam.questions = reordered;
    await exam.save();

    await logActivity(req.admin._id, 'QUESTIONS_REORDERED', `Questions reordered: ${exam.title}`, {
      examId: exam._id,
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function bulkAdd(req, res, next) {
  try {
    const exam = await Test.findById(req.params.examId);
    requireExam(exam);

    const items = req.body?.questions;
    if (!Array.isArray(items) || items.length === 0) {
      throw new HttpError('No questions provided', 400);
    }

    const normalized = items
      .map((q) => {
        if (!q?.prompt || !Array.isArray(q.options) || !q.correctOptionId) return null;
        return {
          id: q.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          prompt: q.prompt,
          options: q.options,
          correctOptionId: q.correctOptionId,
          marks: q.marks ?? 1,
          explanation: q.explanation || '',
        };
      })
      .filter(Boolean);

    exam.questions.push(...normalized);
    await exam.save();

    await logActivity(req.admin._id, 'QUESTIONS_BULK_ADDED', `Bulk questions added: ${exam.title}`, {
      examId: exam._id,
      count: normalized.length,
    });

    res.status(201).json({ added: normalized.length });
  } catch (e) {
    next(e);
  }
}
