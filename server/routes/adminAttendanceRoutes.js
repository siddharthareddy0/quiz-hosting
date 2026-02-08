import express from 'express';

import { requireAdmin } from '../middleware/adminAuthMiddleware.js';
import { attendanceRows } from '../controllers/adminAttendanceController.js';

const router = express.Router();

router.get('/rows', requireAdmin, attendanceRows);

export default router;
