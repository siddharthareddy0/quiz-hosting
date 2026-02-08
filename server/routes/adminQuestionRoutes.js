import express from 'express';

import { requireAdmin } from '../middleware/adminAuthMiddleware.js';
import {
  addQuestion,
  bulkAdd,
  deleteQuestion,
  listQuestions,
  reorderQuestions,
  updateQuestion,
  updateQuestionSettings,
} from '../controllers/adminQuestionController.js';

const router = express.Router({ mergeParams: true });

router.get('/questions', requireAdmin, listQuestions);
router.put('/question-settings', requireAdmin, updateQuestionSettings);

router.post('/questions', requireAdmin, addQuestion);
router.post('/questions/bulk', requireAdmin, bulkAdd);
router.put('/questions/reorder', requireAdmin, reorderQuestions);

router.put('/questions/:questionId', requireAdmin, updateQuestion);
router.delete('/questions/:questionId', requireAdmin, deleteQuestion);

export default router;
