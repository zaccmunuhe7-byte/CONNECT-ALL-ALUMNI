import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { query } from '../../db/pool.js';
import { upload } from '../../middleware/upload.js';

export const postRouter = Router();
postRouter.use(requireAuth);

postRouter.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.id, p.body, p.image_url AS "imageUrl", p.visibility, p.created_at AS "createdAt",
        json_build_object('id', u.id, 'fullName', u.full_name, 'profilePictureUrl', pr.profile_picture_url) AS author,
        COALESCE(
          (SELECT json_agg(json_build_object('reaction', r.reaction, 'count', r.cnt))
           FROM (SELECT reaction, count(*)::int AS cnt FROM post_reactions WHERE post_id = p.id GROUP BY reaction) r
          ), '[]'
        ) AS reactions,
        (SELECT reaction FROM post_reactions WHERE post_id = p.id AND user_id = $1) AS "myReaction",
        (SELECT count(*)::int FROM post_reactions WHERE post_id = p.id) AS "reactionCount",
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'id', pc.id, 'body', pc.body, 'authorId', pc.author_id,
          'authorName', cu.full_name, 'createdAt', pc.created_at
        )) FILTER (WHERE pc.id IS NOT NULL), '[]') AS comments
       FROM posts p
       JOIN users u ON u.id = p.author_id
       JOIN profiles pr ON pr.user_id = u.id
       LEFT JOIN post_comments pc ON pc.post_id = p.id AND pc.moderation_status = 'VISIBLE'
       LEFT JOIN users cu ON cu.id = pc.author_id
       WHERE p.moderation_status = 'VISIBLE'
         AND (
           p.visibility = 'EVERYONE'
           OR p.author_id = $1
           OR EXISTS (
             SELECT 1 FROM connections c
             WHERE c.status = 'ACCEPTED'
               AND ((c.requester_id = p.author_id AND c.addressee_id = $1)
                 OR (c.requester_id = $1 AND c.addressee_id = p.author_id))
           )
         )
       GROUP BY p.id, u.id, pr.user_id
       ORDER BY p.created_at DESC
       LIMIT 50`,
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Create post with optional image upload and visibility
postRouter.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const body = req.body?.body;
    if (!body || body.length < 1) {
      return res.status(400).json({ error: { message: 'Post body is required' } });
    }
    const visibility = req.body?.visibility === 'CONNECTIONS' ? 'CONNECTIONS' : 'EVERYONE';
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const result = await query(
      `INSERT INTO posts (author_id, body, image_url, visibility) VALUES ($1, $2, $3, $4)
       RETURNING id, body, image_url AS "imageUrl", visibility, created_at AS "createdAt"`,
      [req.user!.id, body, imageUrl, visibility]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// React to a post (like, love, clap, wow, fire)
postRouter.post('/:postId/react', validate(z.object({
  body: z.object({ reaction: z.enum(['like', 'love', 'clap', 'wow', 'fire']) })
})), async (req, res, next) => {
  try {
    const { reaction } = req.body;
    // Check if user already has the same reaction — toggle off. Otherwise upsert.
    const existing = await query(
      'SELECT reaction FROM post_reactions WHERE post_id = $1 AND user_id = $2',
      [req.params.postId, req.user!.id]
    );
    if (existing.rowCount && existing.rows[0].reaction === reaction) {
      // Remove reaction (toggle off)
      await query('DELETE FROM post_reactions WHERE post_id = $1 AND user_id = $2', [req.params.postId, req.user!.id]);
      res.json({ reacted: false, reaction: null });
    } else {
      // Upsert reaction
      await query(
        `INSERT INTO post_reactions (post_id, user_id, reaction)
         VALUES ($1, $2, $3)
         ON CONFLICT (post_id, user_id) DO UPDATE SET reaction = $3, created_at = now()`,
        [req.params.postId, req.user!.id, reaction]
      );
      res.json({ reacted: true, reaction });
    }
  } catch (error) {
    next(error);
  }
});

// Keep legacy like endpoint for backwards compatibility
postRouter.post('/:postId/like', async (req, res, next) => {
  try {
    const existing = await query(
      'SELECT reaction FROM post_reactions WHERE post_id = $1 AND user_id = $2',
      [req.params.postId, req.user!.id]
    );
    if (existing.rowCount) {
      await query('DELETE FROM post_reactions WHERE post_id = $1 AND user_id = $2', [req.params.postId, req.user!.id]);
      res.json({ liked: false });
    } else {
      await query(
        `INSERT INTO post_reactions (post_id, user_id, reaction) VALUES ($1, $2, 'like')
         ON CONFLICT (post_id, user_id) DO UPDATE SET reaction = 'like'`,
        [req.params.postId, req.user!.id]
      );
      res.json({ liked: true });
    }
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

// Delete own comment
postRouter.delete('/:postId/comments/:commentId', async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM post_comments WHERE id = $1 AND author_id = $2 RETURNING id',
      [req.params.commentId, req.user!.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: { message: 'Comment not found or not yours' } });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Delete own post
postRouter.delete('/:postId', async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM posts WHERE id = $1 AND author_id = $2 RETURNING id',
      [req.params.postId, req.user!.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: { message: 'Post not found' } });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
