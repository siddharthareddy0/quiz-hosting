import Attempt from '../models/Attempt.js';
import Test from '../models/Test.js';
import { HttpError } from '../utils/httpError.js';

function getDeviceFingerprint(req) {
  const fp = req.headers['x-device-fingerprint'];
  if (Array.isArray(fp)) return fp[0] || '';
  return String(fp || '').trim();
}

function computeScore(test, answers) {
  const correctById = new Map(test.questions.map((q) => [q.id, q.correctOptionId]));
  let score = 0;
  for (const a of answers) {
    if (!a.selectedOptionId) continue;
    if (correctById.get(a.questionId) === a.selectedOptionId) score += 1;
  }
  return { score, maxScore: test.questions.length };
}

export async function getOrCreateAttempt(req, res, next) {
  try {
    const test = await Test.findById(req.params.testId);
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

    res.json({
      attempt: {
        id: attempt._id,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        timeTakenSeconds: attempt.timeTakenSeconds,
        currentQuestionIndex: attempt.currentQuestionIndex || 0,
        tabSwitchCount: attempt.tabSwitchCount || 0,
        fullscreenExitCount: attempt.fullscreenExitCount || 0,
        examExitCount: attempt.examExitCount || 0,
        lastExitTimestamp: attempt.lastExitTimestamp || null,
        isInRecovery: Boolean(attempt.isInRecovery),
        deviceFingerprint: attempt.deviceFingerprint || '',
        answers: attempt.answers,
        violations: attempt.violations,
      },
    });
  } catch (e) {
    next(e);
  }
}

export async function startAttempt(req, res, next) {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) throw new HttpError('Test not found', 404);

    const now = new Date();
    if (now < test.startAt || now > test.endAt) {
      throw new HttpError('Exam not available', 403);
    }

    const fp = getDeviceFingerprint(req);

    let attempt = await Attempt.findOne({ userId: req.user._id, testId: test._id });

    if (!attempt) {
      attempt = await Attempt.create({
        userId: req.user._id,
        testId: test._id,
        startedAt: now,
        deviceFingerprint: fp || '',
        answers: test.questions.map((q) => ({
          questionId: q.id,
          selectedOptionId: null,
          markedForReview: false,
          visited: false,
        })),
      });
    }

    if (attempt.deviceFingerprint && fp && attempt.deviceFingerprint !== fp) {
      throw new HttpError('Session is active on another device', 403);
    }
    if (!attempt.deviceFingerprint && fp) {
      attempt.deviceFingerprint = fp;
    }

    if (!attempt.startedAt) {
      attempt.startedAt = now;
    }
    if (!Array.isArray(attempt.answers) || attempt.answers.length !== test.questions.length) {
      attempt.answers = test.questions.map((q) => {
        const existing = attempt.answers?.find((a) => a.questionId === q.id) || null;
        return (
          existing || {
            questionId: q.id,
            selectedOptionId: null,
            markedForReview: false,
            visited: false,
          }
        );
      });
    }

    await attempt.save();

    res.json({ attempt: { id: attempt._id, startedAt: attempt.startedAt } });
  } catch (e) {
    next(e);
  }
}

export async function saveProgress(req, res, next) {
  try {
    const attempt = await Attempt.findOne({ userId: req.user._id, testId: req.params.testId });
    if (!attempt) throw new HttpError('Attempt not found', 404);
    if (attempt.submittedAt) throw new HttpError('Attempt already submitted', 409);

    const fp = getDeviceFingerprint(req);
    if (attempt.deviceFingerprint && fp && attempt.deviceFingerprint !== fp) {
      throw new HttpError('Session is active on another device', 403);
    }
    if (!attempt.deviceFingerprint && fp) {
      attempt.deviceFingerprint = fp;
    }

    const {
      answers,
      violations,
      currentQuestionIndex,
      tabSwitchCount,
      fullscreenExitCount,
      examExitCount,
      lastExitTimestamp,
      isInRecovery,
      deviceFingerprint,
    } = req.body;

    if (Array.isArray(answers)) attempt.answers = answers;
    if (Array.isArray(violations)) attempt.violations = violations;
    if (typeof currentQuestionIndex === 'number' && Number.isFinite(currentQuestionIndex)) {
      attempt.currentQuestionIndex = Math.max(0, currentQuestionIndex);
    }
    if (typeof tabSwitchCount === 'number' && Number.isFinite(tabSwitchCount)) {
      attempt.tabSwitchCount = Math.max(0, tabSwitchCount);
    }
    if (typeof fullscreenExitCount === 'number' && Number.isFinite(fullscreenExitCount)) {
      attempt.fullscreenExitCount = Math.max(0, fullscreenExitCount);
    }
    if (typeof examExitCount === 'number' && Number.isFinite(examExitCount)) {
      attempt.examExitCount = Math.max(0, examExitCount);
    }
    if (typeof lastExitTimestamp === 'string' || lastExitTimestamp instanceof Date) {
      const d = new Date(lastExitTimestamp);
      if (!Number.isNaN(d.getTime())) attempt.lastExitTimestamp = d;
    }
    if (typeof isInRecovery === 'boolean') {
      attempt.isInRecovery = isInRecovery;
    }
    if (typeof deviceFingerprint === 'string' && deviceFingerprint.trim()) {
      if (attempt.deviceFingerprint && attempt.deviceFingerprint !== deviceFingerprint.trim()) {
        throw new HttpError('Session is active on another device', 403);
      }
      attempt.deviceFingerprint = deviceFingerprint.trim();
    }

    await attempt.save();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function submitAttempt(req, res, next) {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) throw new HttpError('Test not found', 404);

    const attempt = await Attempt.findOne({ userId: req.user._id, testId: test._id });
    if (!attempt) throw new HttpError('Attempt not found', 404);

    const fp = getDeviceFingerprint(req);
    if (attempt.deviceFingerprint && fp && attempt.deviceFingerprint !== fp) {
      throw new HttpError('Session is active on another device', 403);
    }
    if (!attempt.deviceFingerprint && fp) {
      attempt.deviceFingerprint = fp;
    }

    if (attempt.submittedAt) {
      return res.json({ submitted: true, attemptId: attempt._id });
    }

    const { timeTakenSeconds, answers, violations } = req.body;
    if (Array.isArray(answers)) attempt.answers = answers;
    if (Array.isArray(violations)) attempt.violations = violations;
    if (typeof timeTakenSeconds === 'number') attempt.timeTakenSeconds = timeTakenSeconds;

    const { score, maxScore } = computeScore(test, attempt.answers);
    attempt.score = score;
    attempt.maxScore = maxScore;
    attempt.submittedAt = new Date();

    await attempt.save();

    res.json({ submitted: true, attemptId: attempt._id, score, maxScore });
  } catch (e) {
    next(e);
  }
}

export async function getReview(req, res, next) {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) throw new HttpError('Test not found', 404);

    const attempt = await Attempt.findOne({ userId: req.user._id, testId: test._id });
    if (!attempt) throw new HttpError('Attempt not found', 404);

    const correct = test.questions.map((q) => ({
      questionId: q.id,
      correctOptionId: q.correctOptionId,
      explanation: q.explanation,
    }));

    res.json({
      attempt: {
        id: attempt._id,
        score: attempt.score,
        maxScore: attempt.maxScore,
        timeTakenSeconds: attempt.timeTakenSeconds,
        submittedAt: attempt.submittedAt,
        answers: attempt.answers,
      },
      test: {
        id: test._id,
        title: test.title,
        questions: test.questions.map((q) => ({
          id: q.id,
          prompt: q.prompt,
          options: q.options,
        })),
      },
      correct,
    });
  } catch (e) {
    next(e);
  }
}

export async function leaderboard(req, res, next) {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) throw new HttpError('Test not found', 404);

    const top = await Attempt.find({ testId: test._id, submittedAt: { $ne: null } })
      .sort({ score: -1, timeTakenSeconds: 1, submittedAt: 1 })
      .limit(50)
      .populate('userId', 'name email');

    const items = top.map((a, idx) => ({
      rank: idx + 1,
      user: { id: a.userId._id, name: a.userId.name || a.userId.email },
      score: a.score,
      maxScore: a.maxScore,
      timeTakenSeconds: a.timeTakenSeconds,
    }));

    const my = await Attempt.findOne({ testId: test._id, userId: req.user._id });

    res.json({
      leaderboardEnabled: test.leaderboardEnabled,
      items,
      myAttempt: my
        ? {
            score: my.score,
            maxScore: my.maxScore,
            timeTakenSeconds: my.timeTakenSeconds,
          }
        : null,
    });
  } catch (e) {
    next(e);
  }
}
