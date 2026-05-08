import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { query } from '../../db/pool.js';

export const notificationRouter = Router();
notificationRouter.use(requireAuth);

// Get all notifications for current user
notificationRouter.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, type, title, body, reference_id AS "referenceId", is_read AS "isRead",
        created_at AS "createdAt"
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get unread count
notificationRouter.get('/unread-count', async (req, res, next) => {
  try {
    const result = await query<{ count: number }>(
      'SELECT count(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user!.id]
    );
    res.json({ count: result.rows[0].count });
  } catch (error) {
    next(error);
  }
});

// Mark single notification as read
notificationRouter.patch('/:notifId/read', async (req, res, next) => {
  try {
    await query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [req.params.notifId, req.user!.id]
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Mark all as read
notificationRouter.patch('/read-all', async (req, res, next) => {
  try {
    await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [req.user!.id]
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
