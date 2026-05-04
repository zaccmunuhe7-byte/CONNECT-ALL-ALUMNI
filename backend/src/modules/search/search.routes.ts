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
    school: z.string().optional(),
    workplace: z.string().optional()
  })
})), async (req, res, next) => {
  try {
    const school = req.query.school ? `%${String(req.query.school).toLowerCase()}%` : null;
    const workplace = req.query.workplace ? `%${String(req.query.workplace).toLowerCase()}%` : null;
    const result = await query(
      `SELECT u.id AS user_id, u.full_name, u.email, u.role, u.status,
        p.phone_number, p.primary_school, p.high_school, p.university,
        p.current_job, p.current_workplace, p.past_jobs, p.work_experience,
        p.profile_picture_url, p.email_visibility, p.phone_visibility,
        '[]'::json AS images,
        (u.id = $1) AS viewer_is_owner,
        $2::boolean AS viewer_is_admin
       FROM users u JOIN profiles p ON p.user_id = u.id
       WHERE u.status = 'ACTIVE'
         AND (
          ($3::text IS NOT NULL AND (
            lower(p.primary_school) LIKE $3 OR lower(p.high_school) LIKE $3 OR lower(p.university) LIKE $3
          ))
          OR ($4::text IS NOT NULL AND lower(p.current_workplace) LIKE $4)
         )
       LIMIT 50`,
      [req.user!.id, req.user!.role === 'ADMIN', school, workplace]
    );
    res.json(result.rows.map(serializeProfile));
  } catch (error) {
    next(error);
  }
});
