import express from 'express';

import { dashboardStats } from '../controllers/adminDashboardController.js';
import { requireAdmin } from '../middleware/adminAuthMiddleware.js';

const router = express.Router();

router.get('/stats', requireAdmin, dashboardStats);

export default router;
