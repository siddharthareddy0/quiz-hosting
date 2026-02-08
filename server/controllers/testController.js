import Test from '../models/Test.js';
import Attempt from '../models/Attempt.js';

export async function listTests(req, res, next) {
  try {
    const now = new Date();

    const tests = await Test.find({
      $and: [
        { $or: [{ published: { $exists: false } }, { published: { $ne: false } }] },
        {
          $or: [
            { assignmentMode: { $exists: false } },
            { assignmentMode: 'all' },
            { assignedUserIds: req.user._id },
          ],
        },
      ],
    })
      .select('-questions.correctOptionId -questions.explanation')
      .sort({ startAt: 1 });

    const attempts = await Attempt.find({ userId: req.user._id }).select('testId score submittedAt maxScore');
    const byTestId = new Map(attempts.map((a) => [a.testId.toString(), a]));

    const rankByTestId = new Map();

    for (const t of tests) {
      if (!t.leaderboardEnabled) continue;
      const myAttempt = byTestId.get(t._id.toString());
      if (!myAttempt?.submittedAt) continue;

      const top = await Attempt.find({ testId: t._id, submittedAt: { $ne: null } })
        .sort({ score: -1, timeTakenSeconds: 1, submittedAt: 1 })
        .select('userId')
        .limit(50);

      const myIdx = top.findIndex((a) => a.userId.toString() === req.user._id.toString());
      if (myIdx !== -1) {
        rankByTestId.set(t._id.toString(), myIdx + 1);
      }
    }

    const formatted = tests.map((t) => {
      const a = byTestId.get(t._id.toString()) || null;
      const myRank = rankByTestId.get(t._id.toString()) || null;
      return {
        id: t._id,
        title: t.title,
        description: t.description,
        startAt: t.startAt,
        endAt: t.endAt,
        durationMinutes: t.durationMinutes,
        leaderboardEnabled: t.leaderboardEnabled,
        status: now < t.startAt ? 'upcoming' : now > t.endAt ? 'ended' : 'live',
        attempted: Boolean(a?.submittedAt),
        score: a?.score ?? null,
        maxScore: a?.maxScore ?? null,
        myRank,
        top5: Boolean(myRank && myRank <= 5),
      };
    });

    res.json({ tests: formatted });
  } catch (e) {
    next(e);
  }
}

export async function getTestPublic(req, res, next) {
  try {
    const test = await Test.findById(req.params.id).select('-questions.correctOptionId -questions.explanation');
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    res.json({
      test: {
        id: test._id,
        title: test.title,
        description: test.description,
        startAt: test.startAt,
        endAt: test.endAt,
        durationMinutes: test.durationMinutes,
        leaderboardEnabled: test.leaderboardEnabled,
        questionCount: test.questions.length,
      },
    });
  } catch (e) {
    next(e);
  }
}

export async function getTestForExam(req, res, next) {
  try {
    const test = await Test.findById(req.params.id).select('-questions.correctOptionId -questions.explanation');
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    res.json({
      test: {
        id: test._id,
        title: test.title,
        startAt: test.startAt,
        endAt: test.endAt,
        durationMinutes: test.durationMinutes,
        leaderboardEnabled: test.leaderboardEnabled,
        questions: test.questions,
      },
    });
  } catch (e) {
    next(e);
  }
}
