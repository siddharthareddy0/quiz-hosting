import express from 'express';

import { requireAdmin } from '../middleware/adminAuthMiddleware.js';
import { examResults, recalculateExam, updateLeaderboard } from '../controllers/adminResultsController.js';

const router = express.Router({ mergeParams: true });

router.get('/results', requireAdmin, examResults);
router.post('/results/recalculate', requireAdmin, recalculateExam);
router.put('/results/leaderboard', requireAdmin, updateLeaderboard);

export default router;
