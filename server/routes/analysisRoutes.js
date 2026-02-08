import express from 'express';

import { requireAuth } from '../middleware/authMiddleware.js';
import { userAnalysis } from '../controllers/analysisController.js';

const router = express.Router();

router.get('/me', requireAuth, userAnalysis);

export default router;
