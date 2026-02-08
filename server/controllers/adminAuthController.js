import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';

import Admin from '../models/Admin.js';
import { HttpError } from '../utils/httpError.js';

function signAdminToken(adminId) {
  return jwt.sign({ sub: adminId, type: 'admin' }, process.env.JWT_SECRET, { expiresIn: '12h' });
}

export async function adminLogin(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new HttpError('Invalid input', 400);
    }

    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin || !admin.active) {
      throw new HttpError('Invalid credentials', 401);
    }

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      throw new HttpError('Invalid credentials', 401);
    }

    const token = signAdminToken(admin._id.toString());

    res.json({
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (e) {
    next(e);
  }
}

export async function adminMe(req, res) {
  res.json({ admin: req.admin });
}

export async function ensureBootstrapAdmin(req, res, next) {
  try {
    const enabled = (process.env.ADMIN_BOOTSTRAP_ENABLED || 'false').toLowerCase() === 'true';
    if (!enabled) {
      throw new HttpError('Not found', 404);
    }

    const { name, email, password } = req.body;
    if (!email || !password) throw new HttpError('Invalid input', 400);

    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(200).json({ ok: true });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await Admin.create({ name: name || 'Admin', email, passwordHash, role: 'admin', active: true });

    res.status(201).json({ ok: true });
  } catch (e) {
    next(e);
  }
}
