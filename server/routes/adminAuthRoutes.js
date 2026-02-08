import express from 'express';
import { body } from 'express-validator';

import { adminLogin, adminMe, ensureBootstrapAdmin } from '../controllers/adminAuthController.js';
import { requireAdmin } from '../middleware/adminAuthMiddleware.js';

const router = express.Router();

router.post('/login', [body('email').isEmail(), body('password').isString()], adminLogin);
router.get('/me', requireAdmin, adminMe);

router.post('/bootstrap', ensureBootstrapAdmin);

export default router;
