import express from 'express';

import { requireAdmin } from '../middleware/adminAuthMiddleware.js';
import { listUsers } from '../controllers/adminUserController.js';

const router = express.Router();

router.get('/', requireAdmin, listUsers);

export default router;
