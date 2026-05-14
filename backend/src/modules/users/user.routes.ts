import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireOwnerOrAdmin } from '../../middleware/privacy.js';
import { query } from '../../db/pool.js';
import { AppError } from '../../utils/errors.js';

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

// Protected: Only the owner or an admin can access another user's full data
userRouter.get('/:userId', requireOwnerOrAdmin('userId'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, full_name AS "fullName", email, role, status, email_verified_at AS "emailVerifiedAt", created_at AS "createdAt"
       FROM users WHERE id = $1`,
      [req.params.userId]
    );
    if (!result.rowCount) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});
