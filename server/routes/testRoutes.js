import express from 'express';

import { requireAuth } from '../middleware/authMiddleware.js';
import { getTestForExam, getTestPublic, listTests } from '../controllers/testController.js';

const router = express.Router();

router.get('/', requireAuth, listTests);
router.get('/:id', requireAuth, getTestPublic);
router.get('/:id/exam', requireAuth, getTestForExam);

export default router;
