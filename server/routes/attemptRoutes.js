import express from 'express';

import { requireAuth } from '../middleware/authMiddleware.js';
import {
  getOrCreateAttempt,
  getReview,
  leaderboard,
  saveProgress,
  startAttempt,
  submitAttempt,
} from '../controllers/attemptController.js';

const router = express.Router();

router.get('/:testId', requireAuth, getOrCreateAttempt);
router.post('/:testId/start', requireAuth, startAttempt);
router.put('/:testId/progress', requireAuth, saveProgress);
router.post('/:testId/submit', requireAuth, submitAttempt);
router.get('/:testId/review', requireAuth, getReview);
router.get('/:testId/leaderboard', requireAuth, leaderboard);

export default router;
