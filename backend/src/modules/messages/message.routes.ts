import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { query } from '../../db/pool.js';
import { AppError } from '../../utils/errors.js';

export const messageRouter = Router();
messageRouter.use(requireAuth);

async function assertMember(conversationId: string, userId: string) {
  const result = await query(
    'SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, userId]
  );
  if (!result.rowCount) throw new AppError(403, 'Conversation access denied', 'CONVERSATION_DENIED');
}

messageRouter.get('/conversations', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.id, c.created_at AS "createdAt",
        json_agg(json_build_object('id', u.id, 'fullName', u.full_name)) AS members,
        max(m.created_at) AS "lastMessageAt"
       FROM conversations c
       JOIN conversation_members cm ON cm.conversation_id = c.id
       JOIN conversation_members all_cm ON all_cm.conversation_id = c.id
       JOIN users u ON u.id = all_cm.user_id
       LEFT JOIN messages m ON m.conversation_id = c.id
       WHERE cm.user_id = $1
       GROUP BY c.id
       ORDER BY max(m.created_at) DESC NULLS LAST, c.created_at DESC`,
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

messageRouter.post('/conversations', validate(z.object({
  body: z.object({ participantId: z.string().uuid() })
})), async (req, res, next) => {
  try {
    if (req.body.participantId === req.user!.id) throw new AppError(400, 'Cannot message yourself', 'INVALID_PARTICIPANT');
    const existing = await query(
      `SELECT c.id FROM conversations c
       JOIN conversation_members a ON a.conversation_id = c.id AND a.user_id = $1
       JOIN conversation_members b ON b.conversation_id = c.id AND b.user_id = $2
       LIMIT 1`,
      [req.user!.id, req.body.participantId]
    );
    if (existing.rowCount) return res.json(existing.rows[0]);

    const created = await query<{ id: string }>('INSERT INTO conversations DEFAULT VALUES RETURNING id');
    await query(
      `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
      [created.rows[0].id, req.user!.id, req.body.participantId]
    );
    res.status(201).json(created.rows[0]);
  } catch (error) {
    next(error);
  }
});

messageRouter.get('/conversations/:conversationId/messages', async (req, res, next) => {
  try {
    await assertMember(req.params.conversationId, req.user!.id);
    await query(
      'UPDATE conversation_members SET last_read_at = now() WHERE conversation_id = $1 AND user_id = $2',
      [req.params.conversationId, req.user!.id]
    );
    const result = await query(
      `SELECT id, conversation_id AS "conversationId", sender_id AS "senderId", body, created_at AS "createdAt", read_at AS "readAt"
       FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 200`,
      [req.params.conversationId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

messageRouter.post('/conversations/:conversationId/messages', validate(z.object({
  params: z.object({ conversationId: z.string().uuid() }),
  body: z.object({ body: z.string().min(1).max(2000) })
})), async (req, res, next) => {
  try {
    await assertMember(req.params.conversationId, req.user!.id);
    const result = await query(
      `INSERT INTO messages (conversation_id, sender_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, conversation_id AS "conversationId", sender_id AS "senderId", body, created_at AS "createdAt"`,
      [req.params.conversationId, req.user!.id, req.body.body]
    );
    req.app.get('io')?.to(req.params.conversationId).emit('message:new', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});
