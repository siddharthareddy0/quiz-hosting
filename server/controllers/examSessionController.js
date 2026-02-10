import Attempt from '../models/Attempt.js';
import Test from '../models/Test.js';
import { HttpError } from '../utils/httpError.js';

function getDeviceFingerprint(req) {
  const fp = req.headers['x-device-fingerprint'];
  if (Array.isArray(fp)) return fp[0] || '';
  return String(fp || '').trim();
}

export async function getSessionStatus(req, res, next) {
  try {
    const examId = req.query.examId;
    if (!examId) throw new HttpError('examId is required', 400);

    const test = await Test.findById(examId);
    if (!test) throw new HttpError('Test not found', 404);

    let attempt = await Attempt.findOne({ userId: req.user._id, testId: test._id });

    if (!attempt) {
      attempt = await Attempt.create({
        userId: req.user._id,
        testId: test._id,
        answers: test.questions.map((q) => ({
          questionId: q.id,
          selectedOptionId: null,
          markedForReview: false,
          visited: false,
        })),
      });
    }

    const incomingFp = getDeviceFingerprint(req);
    if (attempt.deviceFingerprint && incomingFp && attempt.deviceFingerprint !== incomingFp) {
      throw new HttpError('Session is active on another device', 403);
    }
    if (!attempt.deviceFingerprint && incomingFp) {
      attempt.deviceFingerprint = incomingFp;
      await attempt.save();
    }

    const durationSeconds = (test.durationMinutes || 0) * 60;
    const startedAtMs = attempt.startedAt ? new Date(attempt.startedAt).getTime() : null;
    const serverNowMs = Date.now();

    let remainingSeconds = null;
    let endTime = null;

    if (startedAtMs && durationSeconds > 0) {
      const elapsedSeconds = Math.floor((serverNowMs - startedAtMs) / 1000);
      remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
      endTime = new Date(startedAtMs + durationSeconds * 1000);
    }

    res.json({
      session: {
        examSessionId: attempt._id,
        userId: req.user._id,
        examId: test._id,
        startTime: attempt.startedAt,
        endTime,
        remainingTime: remainingSeconds,
        answers: attempt.answers,
        currentQuestionIndex: attempt.currentQuestionIndex || 0,
        tabSwitchCount: attempt.tabSwitchCount || 0,
        fullscreenExitCount: attempt.fullscreenExitCount || 0,
        examExitCount: attempt.examExitCount || 0,
        lastExitTimestamp: attempt.lastExitTimestamp || null,
        isInRecovery: Boolean(attempt.isInRecovery),
        violations: attempt.violations,
        violationCount: Array.isArray(attempt.violations) ? attempt.violations.length : 0,
        deviceFingerprint: attempt.deviceFingerprint || '',
        isSubmitted: Boolean(attempt.submittedAt),
        submittedAt: attempt.submittedAt,
      },
      serverNow: new Date(serverNowMs).toISOString(),
    });
  } catch (e) {
    next(e);
  }
}
