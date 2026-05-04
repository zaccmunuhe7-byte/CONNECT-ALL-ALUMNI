import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { query } from '../../db/pool.js';

export const userRouter = Router();
userRouter.use(requireAuth);

userRouter.get('/me', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, full_name AS "fullName", email, role, status, email_verified_at AS "emailVerifiedAt", created_at AS "createdAt"
       FROM users WHERE id = $1`,
      [req.user!.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});
