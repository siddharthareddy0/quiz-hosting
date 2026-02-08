import { validationResult } from 'express-validator';

import AdminActivity from '../models/AdminActivity.js';
import Test from '../models/Test.js';
import { HttpError } from '../utils/httpError.js';

async function logActivity(adminId, type, message, meta = {}) {
  await AdminActivity.create({ adminId, type, message, meta });
}

export async function listExams(req, res, next) {
  try {
    const exams = await Test.find({}).sort({ createdAt: -1 }).select('-questions');
    res.json({ exams });
  } catch (e) {
    next(e);
  }
}

export async function getExam(req, res, next) {
  try {
    const exam = await Test.findById(req.params.examId);
    if (!exam) throw new HttpError('Exam not found', 404);
    res.json({ exam });
  } catch (e) {
    next(e);
  }
}

export async function createExam(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new HttpError('Invalid input', 400);

    const payload = req.body;

    const exam = await Test.create({
      title: payload.title,
      description: payload.description || '',
      instructions: payload.instructions || '',
      startAt: payload.startAt,
      endAt: payload.endAt,
      durationMinutes: payload.durationMinutes,
      lateEntryBlocked: Boolean(payload.lateEntryBlocked),
      totalMarks: payload.totalMarks ?? 0,
      passingMarks: payload.passingMarks ?? 0,
      negativeMarkingEnabled: Boolean(payload.negativeMarkingEnabled),
      negativeMarkPerQuestion: payload.negativeMarkPerQuestion ?? 0,
      leaderboardEnabled: Boolean(payload.leaderboardEnabled),
      leaderboardVisible: payload.leaderboardVisible ?? true,
      answerKeyVisible: payload.answerKeyVisible ?? true,
      shuffleQuestions: Boolean(payload.shuffleQuestions),
      shuffleOptions: Boolean(payload.shuffleOptions),
      assignmentMode: payload.assignmentMode || 'all',
      assignedUserIds: Array.isArray(payload.assignedUserIds) ? payload.assignedUserIds : [],
      published: Boolean(payload.published),
      publishedAt: payload.published ? new Date() : null,
    });

    await logActivity(req.admin._id, 'EXAM_CREATED', `Exam created: ${exam.title}`, { examId: exam._id });

    res.status(201).json({ exam });
  } catch (e) {
    next(e);
  }
}

export async function updateExam(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new HttpError('Invalid input', 400);

    const exam = await Test.findById(req.params.examId);
    if (!exam) throw new HttpError('Exam not found', 404);

    const payload = req.body;

    const allowed = [
      'title',
      'description',
      'instructions',
      'startAt',
      'endAt',
      'durationMinutes',
      'lateEntryBlocked',
      'totalMarks',
      'passingMarks',
      'negativeMarkingEnabled',
      'negativeMarkPerQuestion',
      'leaderboardEnabled',
      'leaderboardVisible',
      'answerKeyVisible',
      'shuffleQuestions',
      'shuffleOptions',
      'assignmentMode',
      'assignedUserIds',
    ];

    for (const k of allowed) {
      if (k in payload) exam[k] = payload[k];
    }

    await exam.save();

    await logActivity(req.admin._id, 'EXAM_EDITED', `Exam edited: ${exam.title}`, { examId: exam._id });

    res.json({ exam });
  } catch (e) {
    next(e);
  }
}

export async function publishExam(req, res, next) {
  try {
    const exam = await Test.findById(req.params.examId);
    if (!exam) throw new HttpError('Exam not found', 404);

    if (!exam.published) {
      exam.published = true;
      exam.publishedAt = new Date();
      await exam.save();
      await logActivity(req.admin._id, 'EXAM_PUBLISHED', `Exam published: ${exam.title}`, { examId: exam._id });
    }

    res.json({ exam });
  } catch (e) {
    next(e);
  }
}

export async function unpublishExam(req, res, next) {
  try {
    const exam = await Test.findById(req.params.examId);
    if (!exam) throw new HttpError('Exam not found', 404);

    exam.published = false;
    await exam.save();

    await logActivity(req.admin._id, 'EXAM_UNPUBLISHED', `Exam unpublished: ${exam.title}`, { examId: exam._id });

    res.json({ exam });
  } catch (e) {
    next(e);
  }
}

export async function deleteExam(req, res, next) {
  try {
    const exam = await Test.findById(req.params.examId);
    if (!exam) throw new HttpError('Exam not found', 404);

    await Test.deleteOne({ _id: exam._id });

    await logActivity(req.admin._id, 'EXAM_DELETED', `Exam deleted: ${exam.title}`, { examId: exam._id });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}
