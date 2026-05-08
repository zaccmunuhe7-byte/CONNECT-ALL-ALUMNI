import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin, requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { query } from '../../db/pool.js';
import { sendAccountStatusEmail } from '../../utils/mailer.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/users', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.full_name AS "fullName", u.email, u.role, u.status,
        u.date_of_birth AS "dateOfBirth",
        u.email_verified_at AS "emailVerifiedAt",
        u.last_login_at AS "lastLoginAt",
        u.status_reason AS "statusReason", u.appeal_reason AS "appealReason",
        p.phone_number AS "phoneNumber", p.primary_school AS "primarySchool", p.high_school AS "highSchool",
        p.university, p.current_job AS "currentJob", p.current_workplace AS "currentWorkplace",
        p.past_jobs AS "pastJobs", p.work_experience AS "workExperience",
        p.profile_picture_url AS "profilePictureUrl", p.email_visibility AS "emailVisibility",
        p.phone_visibility AS "phoneVisibility", u.created_at AS "createdAt", p.bio,
        (SELECT count(*)::int FROM posts WHERE author_id = u.id) AS "postCount",
        (SELECT count(*)::int FROM connections WHERE (requester_id = u.id OR addressee_id = u.id) AND status = 'ACCEPTED') AS "connectionCount"
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
        count(*) FILTER (WHERE status = 'DELETED')::int AS deleted,
        count(*) FILTER (WHERE last_login_at > now() - interval '24 hours')::int AS "recentLogins",
        count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS "newThisWeek",
        count(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS "newThisMonth",
        count(*) FILTER (WHERE created_at > now() - interval '365 days')::int AS "newThisYear"
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

// Suspend or reactivate a user — with reason and notification
adminRouter.patch('/users/:userId/status', validate(z.object({
  body: z.object({
    status: z.enum(['ACTIVE', 'SUSPENDED', 'DELETED']),
    reason: z.string().max(500).optional()
  })
})), async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const userId = req.params.userId;

    // Update user status and reason
    await query(
      'UPDATE users SET status = $1, status_reason = $2, appeal_reason = CASE WHEN $1 = \'ACTIVE\' THEN NULL ELSE appeal_reason END, updated_at = now() WHERE id = $3',
      [status, reason || null, userId]
    );

    // Revoke all tokens if suspending/deleting so user is immediately logged out
    if (status === 'SUSPENDED' || status === 'DELETED') {
      await query(
        'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
        [userId]
      );
    }

    // Create notification for the user
    let notifTitle = '';
    let notifBody = '';
    if (status === 'SUSPENDED') {
      notifTitle = 'Account Suspended';
      notifBody = `Your account has been suspended by an administrator${reason ? ': ' + reason : '.'}. Contact the admin to request reactivation.`;
    } else if (status === 'DELETED') {
      notifTitle = 'Account Deleted';
      notifBody = `Your account has been permanently deleted by an administrator${reason ? ': ' + reason : '.'}. Contact the admin if you wish to be reinstated.`;
    } else if (status === 'ACTIVE') {
      notifTitle = 'Account Reactivated';
      notifBody = 'Your account has been reactivated by an administrator. You can now log in again.';
    }

    if (notifTitle) {
      await query(
        `INSERT INTO notifications (user_id, type, title, body)
         VALUES ($1, $2, $3, $4)`,
        [userId, `account_${status.toLowerCase()}`, notifTitle, notifBody]
      );
    }

    // Send real email notification
    const userInfo = await query<{ email: string; full_name: string }>(
      'SELECT email, full_name FROM users WHERE id = $1',
      [userId]
    );
    if (userInfo.rows[0]) {
      await sendAccountStatusEmail(
        userInfo.rows[0].email,
        userInfo.rows[0].full_name,
        status,
        reason
      );
    }

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

// Delete a post permanently
adminRouter.delete('/posts/:postId', async (req, res, next) => {
  try {
    await query('DELETE FROM posts WHERE id = $1', [req.params.postId]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Delete a user entirely (permanent)
adminRouter.delete('/users/:userId', async (req, res, next) => {
  try {
    const userId = req.params.userId;

    // Get user info before deleting for notification log
    const userInfo = await query<{ email: string; full_name: string }>(
      'SELECT email, full_name FROM users WHERE id = $1',
      [userId]
    );

    if (userInfo.rows[0]) {
      console.log(`\n📧 ACCOUNT PERMANENTLY DELETED for ${userInfo.rows[0].email} (${userInfo.rows[0].full_name})\n`);
    }

    await query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Clear a user's appeal (reject it)
adminRouter.patch('/users/:userId/clear-appeal', async (req, res, next) => {
  try {
    await query('UPDATE users SET appeal_reason = NULL, updated_at = now() WHERE id = $1', [req.params.userId]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Get single user full detail (all info, even private)
adminRouter.get('/users/:userId/detail', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.full_name AS "fullName", u.email, u.role, u.status,
        u.date_of_birth AS "dateOfBirth",
        u.last_login_at AS "lastLoginAt",
        u.status_reason AS "statusReason", u.appeal_reason AS "appealReason",
        u.created_at AS "createdAt", u.updated_at AS "updatedAt",
        p.phone_number AS "phoneNumber", p.primary_school AS "primarySchool", p.high_school AS "highSchool",
        p.university, p.current_job AS "currentJob", p.current_workplace AS "currentWorkplace",
        p.past_jobs AS "pastJobs", p.work_experience AS "workExperience",
        p.profile_picture_url AS "profilePictureUrl", p.email_visibility AS "emailVisibility",
        p.phone_visibility AS "phoneVisibility", p.dob_visibility AS "dobVisibility",
        p.bio,
        p.github_url AS "githubUrl", p.linkedin_url AS "linkedinUrl",
        p.twitter_url AS "twitterUrl", p.instagram_url AS "instagramUrl",
        p.facebook_url AS "facebookUrl", p.tiktok_url AS "tiktokUrl",
        p.portfolio_url AS "portfolioUrl",
        (SELECT count(*)::int FROM posts WHERE author_id = u.id) AS "postCount",
        (SELECT count(*)::int FROM connections WHERE (requester_id = u.id OR addressee_id = u.id) AND status = 'ACCEPTED') AS "connectionCount",
        (SELECT count(*)::int FROM messages WHERE sender_id = u.id) AS "messageCount"
       FROM users u JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [req.params.userId]
    );
    if (!result.rowCount) return res.status(404).json({ error: { message: 'User not found' } });
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});
