import User from '../models/User.js';

export async function listUsers(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));

    const filter = q
      ? {
          $or: [
            { email: { $regex: q, $options: 'i' } },
            { name: { $regex: q, $options: 'i' } },
          ],
        }
      : {};

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('_id name email createdAt');

    res.json({ users });
  } catch (e) {
    next(e);
  }
}
