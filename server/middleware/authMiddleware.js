import jwt from 'jsonwebtoken';

import { HttpError } from '../utils/httpError.js';
import User from '../models/User.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new HttpError('Unauthorized', 401);
    }

    const token = authHeader.slice('Bearer '.length);
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(payload.sub).select('-passwordHash');
    if (!user) {
      throw new HttpError('Unauthorized', 401);
    }

    req.user = user;
    next();
  } catch (e) {
    next(new HttpError('Unauthorized', 401));
  }
}
