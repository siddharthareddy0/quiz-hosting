import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';

import User from '../models/User.js';
import { HttpError } from '../utils/httpError.js';

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

export async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new HttpError('Invalid input', 400);
    }

    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      throw new HttpError('Email already in use', 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name: name || '', email, passwordHash });

    const token = signToken(user._id.toString());

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (e) {
    next(e);
  }
}

export async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new HttpError('Invalid input', 400);
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throw new HttpError('Invalid credentials', 401);
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new HttpError('Invalid credentials', 401);
    }

    const token = signToken(user._id.toString());

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (e) {
    next(e);
  }
}

export async function me(req, res) {
  res.json({ user: req.user });
}
