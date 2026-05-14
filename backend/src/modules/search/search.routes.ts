import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { query } from '../../db/pool.js';
import { serializeProfile } from '../profiles/profile.serializer.js';

export const searchRouter = Router();
searchRouter.use(requireAuth);

searchRouter.get('/', validate(z.object({
  query: z.object({
    q: z.string().optional(),
    school: z.string().optional(),
    workplace: z.string().optional()
  })
})), async (req, res, next) => {
  try {
    const q = req.query.q ? `%${String(req.query.q).toLowerCase()}%` : null;
    const school = req.query.school ? `%${String(req.query.school).toLowerCase()}%` : null;
    const workplace = req.query.workplace ? `%${String(req.query.workplace).toLowerCase()}%` : null;

    const conditions: string[] = ["u.status = 'ACTIVE'"];
    const params: unknown[] = [req.user!.id, req.user!.role === 'ADMIN'];

    if (q) {
      params.push(q);
      conditions.push(`(lower(u.full_name) LIKE $${params.length})`);
    }
    if (school) {
      params.push(school);
      conditions.push(`(lower(p.primary_school) LIKE $${params.length} OR lower(p.high_school) LIKE $${params.length} OR lower(p.university) LIKE $${params.length})`);
    }
    if (workplace) {
      params.push(workplace);
      conditions.push(`lower(p.current_workplace) LIKE $${params.length}`);
    }

    if (!q && !school && !workplace) {
      return res.json([]);
    }

    const result = await query(
      `SELECT u.id AS user_id, u.full_name, u.email, u.role, u.status,
        p.phone_number, p.primary_school, p.high_school, p.university,
        p.current_job, p.current_workplace, p.past_jobs, p.work_experience,
        p.profile_picture_url, p.email_visibility, p.phone_visibility,
        p.primary_school_start_year, p.primary_school_end_year,
        p.high_school_start_year, p.high_school_end_year,
        p.university_start_year, p.university_end_year, p.bio,
        '[]'::json AS images,
        (u.id = $1) AS viewer_is_owner,
        $2::boolean AS viewer_is_admin
       FROM users u JOIN profiles p ON p.user_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY u.full_name ASC
       LIMIT 50`,
      params
    );
    res.json(result.rows.map(serializeProfile));
  } catch (error) {
    next(error);
  }
});

// Lightweight user search for @mention autocomplete
searchRouter.get('/users', async (req, res, next) => {
  try {
    const q = req.query.q ? `%${String(req.query.q).toLowerCase()}%` : null;
    if (!q) return res.json([]);

    const result = await query<{ id: string; fullName: string; profilePictureUrl: string }>(
      `SELECT u.id, u.full_name AS "fullName", p.profile_picture_url AS "profilePictureUrl"
       FROM users u
       JOIN profiles p ON p.user_id = u.id
       WHERE u.status = 'ACTIVE'
         AND u.id != $1
         AND lower(u.full_name) LIKE $2
       ORDER BY u.full_name ASC
       LIMIT 10`,
      [req.user!.id, q]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});
