import express from 'express';
import { body } from 'express-validator';

import { requireAdmin } from '../middleware/adminAuthMiddleware.js';
import {
  createExam,
  deleteExam,
  getExam,
  listExams,
  publishExam,
  unpublishExam,
  updateExam,
} from '../controllers/adminExamController.js';

const router = express.Router();

router.get('/', requireAdmin, listExams);
router.post(
  '/',
  requireAdmin,
  [
    body('title').isString().notEmpty(),
    body('startAt').isISO8601(),
    body('endAt').isISO8601(),
    body('durationMinutes').isInt({ min: 1 }),
  ],
  createExam
);

router.get('/:examId', requireAdmin, getExam);
router.put(
  '/:examId',
  requireAdmin,
  [
    body('title').optional().isString(),
    body('startAt').optional().isISO8601(),
    body('endAt').optional().isISO8601(),
    body('durationMinutes').optional().isInt({ min: 1 }),
  ],
  updateExam
);

router.post('/:examId/publish', requireAdmin, publishExam);
router.post('/:examId/unpublish', requireAdmin, unpublishExam);
router.delete('/:examId', requireAdmin, deleteExam);

export default router;
