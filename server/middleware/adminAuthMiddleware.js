import jwt from 'jsonwebtoken';

import { HttpError } from '../utils/httpError.js';
import Admin from '../models/Admin.js';

export async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new HttpError('Unauthorized', 401);
    }

    const token = authHeader.slice('Bearer '.length);
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload?.type !== 'admin') {
      throw new HttpError('Unauthorized', 401);
    }

    const admin = await Admin.findById(payload.sub).select('-passwordHash');
    if (!admin || !admin.active) {
      throw new HttpError('Unauthorized', 401);
    }

    req.admin = admin;
    next();
  } catch (e) {
    next(new HttpError('Unauthorized', 401));
  }
}
