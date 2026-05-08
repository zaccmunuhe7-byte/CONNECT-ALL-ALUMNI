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
      `SELECT u.id, u.full_name AS "fullName", u.email, u.role, u.status,
        u.date_of_birth AS "dateOfBirth",
        u.email_verified_at AS "emailVerifiedAt",
        u.last_login_at AS "lastLoginAt",
        p.phone_number AS "phoneNumber", p.primary_school AS "primarySchool", p.high_school AS "highSchool",
        p.university, p.current_job AS "currentJob", p.current_workplace AS "currentWorkplace",
        p.past_jobs AS "pastJobs", p.work_experience AS "workExperience",
        p.profile_picture_url AS "profilePictureUrl", p.email_visibility AS "emailVisibility",
        p.phone_visibility AS "phoneVisibility", u.created_at AS "createdAt", p.bio
       FROM users u JOIN profiles p ON p.user_id = u.id
       ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const [users, posts, connections, messages] = await Promise.all([
      query(`SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE status = 'ACTIVE')::int AS active,
        count(*) FILTER (WHERE status = 'SUSPENDED')::int AS suspended,
        count(*) FILTER (WHERE last_login_at > now() - interval '24 hours')::int AS "recentLogins",
        count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS "newThisWeek"
      FROM users`),
      query(`SELECT count(*)::int AS total,
        count(*) FILTER (WHERE moderation_status = 'VISIBLE')::int AS visible,
        count(*) FILTER (WHERE moderation_status = 'HIDDEN')::int AS hidden,
        count(*) FILTER (WHERE moderation_status = 'REMOVED')::int AS removed
      FROM posts`),
      query(`SELECT count(*)::int AS total,
        count(*) FILTER (WHERE status = 'ACCEPTED')::int AS accepted,
        count(*) FILTER (WHERE status = 'PENDING')::int AS pending
      FROM connections`),
      query(`SELECT count(*)::int AS total FROM messages`)
    ]);
    res.json({
      users: users.rows[0],
      posts: posts.rows[0],
      connections: connections.rows[0],
      messages: messages.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/posts', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT p.id, p.body, p.image_url AS "imageUrl", p.moderation_status AS "moderationStatus",
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

// Delete a user entirely
adminRouter.delete('/users/:userId', async (req, res, next) => {
  try {
    await query('DELETE FROM users WHERE id = $1', [req.params.userId]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
