import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin, requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { query } from '../../db/pool.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/users', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.full_name AS "fullName", u.email, u.role, u.status, u.email_verified_at AS "emailVerifiedAt",
        p.phone_number AS "phoneNumber", p.primary_school AS "primarySchool", p.high_school AS "highSchool",
        p.university, p.current_job AS "currentJob", p.current_workplace AS "currentWorkplace",
        p.past_jobs AS "pastJobs", p.work_experience AS "workExperience",
        p.profile_picture_url AS "profilePictureUrl", p.email_visibility AS "emailVisibility",
        p.phone_visibility AS "phoneVisibility", u.created_at AS "createdAt"
       FROM users u JOIN profiles p ON p.user_id = u.id
       ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/posts', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT p.id, p.body, p.moderation_status AS "moderationStatus",
        p.created_at AS "createdAt",
        json_build_object('id', u.id, 'fullName', u.full_name, 'email', u.email) AS author
       FROM posts p
       JOIN users u ON u.id = p.author_id
       ORDER BY p.created_at DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/users/:userId/status', validate(z.object({
  body: z.object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'DELETED']) })
})), async (req, res, next) => {
  try {
    await query('UPDATE users SET status = $1, updated_at = now() WHERE id = $2', [req.body.status, req.params.userId]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/posts/:postId/moderation', validate(z.object({
  body: z.object({ moderationStatus: z.enum(['VISIBLE', 'HIDDEN', 'REMOVED']) })
})), async (req, res, next) => {
  try {
    await query('UPDATE posts SET moderation_status = $1, updated_at = now() WHERE id = $2', [
      req.body.moderationStatus,
      req.params.postId
    ]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
