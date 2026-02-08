import Attempt from '../models/Attempt.js';
import Test from '../models/Test.js';
import { HttpError } from '../utils/httpError.js';

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

    const attempt = await Attempt.findOneAndUpdate(
      { userId: req.user._id, testId: test._id },
      { $setOnInsert: { startedAt: now } },
      { upsert: true, new: true }
    );

    if (!attempt.startedAt) {
      attempt.startedAt = now;
      await attempt.save();
    }

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

    const { answers, violations } = req.body;
    if (Array.isArray(answers)) {
      attempt.answers = answers;
    }
    if (Array.isArray(violations)) {
      attempt.violations = violations;
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
