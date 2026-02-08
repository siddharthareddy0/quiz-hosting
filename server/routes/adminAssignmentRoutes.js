import express from 'express';

import { requireAdmin } from '../middleware/adminAuthMiddleware.js';
import { getAssignments, updateAssignments } from '../controllers/adminAssignmentController.js';

const router = express.Router({ mergeParams: true });

router.get('/assignments', requireAdmin, getAssignments);
router.put('/assignments', requireAdmin, updateAssignments);

export default router;
