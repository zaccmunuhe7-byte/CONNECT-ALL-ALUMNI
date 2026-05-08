import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { query } from '../../db/pool.js';
import { serializeProfile } from '../profiles/profile.serializer.js';
import { AppError } from '../../utils/errors.js';

export const connectionRouter = Router();
connectionRouter.use(requireAuth);

// Get alumni suggestions (people from same school/workplace)
connectionRouter.get('/suggestions', async (req, res, next) => {
  try {
    const result = await query(
      `WITH me AS (SELECT * FROM profiles WHERE user_id = $1)
       SELECT u.id AS user_id, u.full_name, u.email, u.role, u.status,
        p.phone_number, p.primary_school, p.high_school, p.university,
        p.current_job, p.current_workplace, p.past_jobs, p.work_experience,
        p.profile_picture_url, p.email_visibility, p.phone_visibility,
        p.primary_school_start_year, p.primary_school_end_year,
        p.high_school_start_year, p.high_school_end_year,
        p.university_start_year, p.university_end_year, p.bio,
        '[]'::json AS images,
        false AS viewer_is_owner,
        $2::boolean AS viewer_is_admin,
        (
          CASE WHEN lower(p.primary_school) = lower(me.primary_school) AND me.primary_school IS NOT NULL THEN 1 ELSE 0 END +
          CASE WHEN lower(p.high_school) = lower(me.high_school) AND me.high_school IS NOT NULL THEN 1 ELSE 0 END +
          CASE WHEN lower(p.university) = lower(me.university) AND me.university IS NOT NULL THEN 1 ELSE 0 END +
          CASE WHEN lower(p.current_workplace) = lower(me.current_workplace) AND me.current_workplace IS NOT NULL THEN 1 ELSE 0 END
        ) AS match_score
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       CROSS JOIN me
       WHERE p.user_id <> $1
         AND u.status = 'ACTIVE'
         AND NOT EXISTS (
           SELECT 1 FROM connections c
           WHERE (c.requester_id = $1 AND c.addressee_id = p.user_id)
              OR (c.requester_id = p.user_id AND c.addressee_id = $1)
         )
         AND (
          (lower(p.primary_school) = lower(me.primary_school) AND me.primary_school IS NOT NULL)
          OR (lower(p.high_school) = lower(me.high_school) AND me.high_school IS NOT NULL)
          OR (lower(p.university) = lower(me.university) AND me.university IS NOT NULL)
          OR (lower(p.current_workplace) = lower(me.current_workplace) AND me.current_workplace IS NOT NULL)
         )
       ORDER BY match_score DESC, u.full_name ASC
       LIMIT 25`,
      [req.user!.id, req.user!.role === 'ADMIN']
    );
    res.json(result.rows.map(serializeProfile));
  } catch (error) {
    next(error);
  }
});

// Send connection request
connectionRouter.post('/request', validate(z.object({
  body: z.object({ addresseeId: z.string().uuid() })
})), async (req, res, next) => {
  try {
    if (req.body.addresseeId === req.user!.id) {
      throw new AppError(400, 'Cannot connect with yourself', 'SELF_CONNECTION');
    }
    const existing = await query(
      `SELECT id, status FROM connections
       WHERE (requester_id = $1 AND addressee_id = $2)
          OR (requester_id = $2 AND addressee_id = $1)`,
      [req.user!.id, req.body.addresseeId]
    );
    if (existing.rowCount) {
      throw new AppError(409, 'Connection already exists', 'CONNECTION_EXISTS');
    }
    const result = await query(
      `INSERT INTO connections (requester_id, addressee_id) VALUES ($1, $2) RETURNING id, status`,
      [req.user!.id, req.body.addresseeId]
    );

    // Notify the addressee about the connection request
    const requesterName = await query<{ full_name: string }>(
      'SELECT full_name FROM users WHERE id = $1',
      [req.user!.id]
    );
    if (requesterName.rows[0]) {
      await query(
        `INSERT INTO notifications (user_id, type, title, body, reference_id)
         VALUES ($1, 'connection_request', 'New Connection Request',
                 $2, $3)`,
        [
          req.body.addresseeId,
          `${requesterName.rows[0].full_name} wants to connect with you.`,
          result.rows[0].id
        ]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Accept connection request
connectionRouter.patch('/:connectionId/accept', async (req, res, next) => {
  try {
    const result = await query<{ id: string; status: string; requester_id: string }>(
      `UPDATE connections SET status = 'ACCEPTED', updated_at = now()
       WHERE id = $1 AND addressee_id = $2 AND status = 'PENDING'
       RETURNING id, status, requester_id`,
      [req.params.connectionId, req.user!.id]
    );
    if (!result.rowCount) throw new AppError(404, 'Connection request not found', 'NOT_FOUND');

    // Notify the original requester that their connection was accepted
    const acceptorName = await query<{ full_name: string }>(
      'SELECT full_name FROM users WHERE id = $1',
      [req.user!.id]
    );
    if (acceptorName.rows[0]) {
      await query(
        `INSERT INTO notifications (user_id, type, title, body, reference_id)
         VALUES ($1, 'connection_accepted', 'Connection Accepted',
                 $2, $3)`,
        [
          result.rows[0].requester_id,
          `You are now connected to ${acceptorName.rows[0].full_name}! You can now message each other.`,
          result.rows[0].id
        ]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Decline connection request
connectionRouter.patch('/:connectionId/decline', async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE connections SET status = 'DECLINED', updated_at = now()
       WHERE id = $1 AND addressee_id = $2 AND status = 'PENDING'
       RETURNING id, status`,
      [req.params.connectionId, req.user!.id]
    );
    if (!result.rowCount) throw new AppError(404, 'Connection request not found', 'NOT_FOUND');
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Remove connection
connectionRouter.delete('/:connectionId', async (req, res, next) => {
  try {
    const result = await query(
      `DELETE FROM connections WHERE id = $1
       AND (requester_id = $2 OR addressee_id = $2)
       RETURNING id`,
      [req.params.connectionId, req.user!.id]
    );
    if (!result.rowCount) throw new AppError(404, 'Connection not found', 'NOT_FOUND');
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Get my connections
connectionRouter.get('/mine', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.id AS connection_id, c.status, c.created_at,
        u.id AS user_id, u.full_name, u.email, u.role, u.status AS user_status,
        p.phone_number, p.primary_school, p.high_school, p.university,
        p.current_job, p.current_workplace, p.past_jobs, p.work_experience,
        p.profile_picture_url, p.email_visibility, p.phone_visibility,
        p.bio,
        '[]'::json AS images,
        false AS viewer_is_owner,
        $2::boolean AS viewer_is_admin
       FROM connections c
       JOIN users u ON u.id = CASE WHEN c.requester_id = $1 THEN c.addressee_id ELSE c.requester_id END
       JOIN profiles p ON p.user_id = u.id
       WHERE (c.requester_id = $1 OR c.addressee_id = $1)
         AND c.status = 'ACCEPTED'
         AND u.status = 'ACTIVE'
       ORDER BY u.full_name ASC`,
      [req.user!.id, req.user!.role === 'ADMIN']
    );
    res.json(result.rows.map((row) => ({
      connectionId: row.connection_id,
      ...serializeProfile(row)
    })));
  } catch (error) {
    next(error);
  }
});

// Get pending requests (received)
connectionRouter.get('/pending', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.id AS connection_id, c.status, c.created_at,
        u.id AS user_id, u.full_name, u.email, u.role, u.status AS user_status,
        p.phone_number, p.primary_school, p.high_school, p.university,
        p.current_job, p.current_workplace, p.past_jobs, p.work_experience,
        p.profile_picture_url, p.email_visibility, p.phone_visibility,
        p.bio,
        '[]'::json AS images,
        false AS viewer_is_owner,
        $2::boolean AS viewer_is_admin
       FROM connections c
       JOIN users u ON u.id = c.requester_id
       JOIN profiles p ON p.user_id = u.id
       WHERE c.addressee_id = $1
         AND c.status = 'PENDING'
         AND u.status = 'ACTIVE'
       ORDER BY c.created_at DESC`,
      [req.user!.id, req.user!.role === 'ADMIN']
    );
    res.json(result.rows.map((row) => ({
      connectionId: row.connection_id,
      ...serializeProfile(row)
    })));
  } catch (error) {
    next(error);
  }
});

// Get sent requests (pending)
connectionRouter.get('/sent', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.id AS connection_id, c.status, c.created_at,
        u.id AS user_id, u.full_name, u.email, u.role, u.status AS user_status,
        p.phone_number, p.primary_school, p.high_school, p.university,
        p.current_job, p.current_workplace, p.past_jobs, p.work_experience,
        p.profile_picture_url, p.email_visibility, p.phone_visibility,
        p.bio,
        '[]'::json AS images,
        false AS viewer_is_owner,
        $2::boolean AS viewer_is_admin
       FROM connections c
       JOIN users u ON u.id = c.addressee_id
       JOIN profiles p ON p.user_id = u.id
       WHERE c.requester_id = $1
         AND c.status = 'PENDING'
         AND u.status = 'ACTIVE'
       ORDER BY c.created_at DESC`,
      [req.user!.id, req.user!.role === 'ADMIN']
    );
    res.json(result.rows.map((row) => ({
      connectionId: row.connection_id,
      ...serializeProfile(row)
    })));
  } catch (error) {
    next(error);
  }
});
