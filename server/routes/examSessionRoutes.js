import express from 'express';

import { requireAuth } from '../middleware/authMiddleware.js';
import { getSessionStatus } from '../controllers/examSessionController.js';

const router = express.Router();

router.get('/session-status', requireAuth, getSessionStatus);

export default router;
