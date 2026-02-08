import express from 'express';

import { requireAdmin } from '../middleware/adminAuthMiddleware.js';
import { listMalpracticeCases, updateMalpracticeStatus } from '../controllers/adminMalpracticeController.js';

const router = express.Router();

router.get('/cases', requireAdmin, listMalpracticeCases);
router.put('/cases/:attemptId/status', requireAdmin, updateMalpracticeStatus);

export default router;
