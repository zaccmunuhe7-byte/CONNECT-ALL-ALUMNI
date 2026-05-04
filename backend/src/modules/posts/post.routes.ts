import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { query } from '../../db/pool.js';

export const postRouter = Router();
postRouter.use(requireAuth);

postRouter.get('/', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT p.id, p.body, p.created_at AS "createdAt",
        json_build_object('id', u.id, 'fullName', u.full_name) AS author,
        count(DISTINCT pl.user_id)::int AS "likeCount",
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'id', pc.id, 'body', pc.body, 'authorId', pc.author_id, 'createdAt', pc.created_at
        )) FILTER (WHERE pc.id IS NOT NULL), '[]') AS comments
       FROM posts p
       JOIN users u ON u.id = p.author_id
       LEFT JOIN post_likes pl ON pl.post_id = p.id
       LEFT JOIN post_comments pc ON pc.post_id = p.id AND pc.moderation_status = 'VISIBLE'
       WHERE p.moderation_status = 'VISIBLE'
       GROUP BY p.id, u.id
       ORDER BY p.created_at DESC
       LIMIT 50`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

postRouter.post('/', validate(z.object({
  body: z.object({ body: z.string().min(1).max(5000) })
})), async (req, res, next) => {
  try {
    const result = await query(
      `INSERT INTO posts (author_id, body) VALUES ($1, $2)
       RETURNING id, body, created_at AS "createdAt"`,
      [req.user!.id, req.body.body]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

postRouter.post('/:postId/like', async (req, res, next) => {
  try {
    const result = await query(
      `WITH deleted AS (
        DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2 RETURNING 1
       )
       INSERT INTO post_likes (post_id, user_id)
       SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM deleted)
       RETURNING 1`,
      [req.params.postId, req.user!.id]
    );
    res.json({ liked: Boolean(result.rowCount) });
  } catch (error) {
    next(error);
  }
});

postRouter.post('/:postId/comments', validate(z.object({
  body: z.object({ body: z.string().min(1).max(2000) })
})), async (req, res, next) => {
  try {
    const result = await query(
      `INSERT INTO post_comments (post_id, author_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, post_id AS "postId", body, created_at AS "createdAt"`,
      [req.params.postId, req.user!.id, req.body.body]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});
