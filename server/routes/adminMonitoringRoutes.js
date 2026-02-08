import express from 'express';

import { requireAdmin } from '../middleware/adminAuthMiddleware.js';
import { liveMonitoring } from '../controllers/adminMonitoringController.js';

const router = express.Router();

router.get('/live', requireAdmin, liveMonitoring);

export default router;
