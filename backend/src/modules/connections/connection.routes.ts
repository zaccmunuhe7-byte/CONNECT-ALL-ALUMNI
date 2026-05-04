import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { query } from '../../db/pool.js';
import { serializeProfile } from '../profiles/profile.serializer.js';

export const connectionRouter = Router();
connectionRouter.use(requireAuth);

connectionRouter.get('/suggestions', async (req, res, next) => {
  try {
    const result = await query(
      `WITH me AS (SELECT * FROM profiles WHERE user_id = $1)
       SELECT u.id AS user_id, u.full_name, u.email, u.role, u.status,
        p.phone_number, p.primary_school, p.high_school, p.university,
        p.current_job, p.current_workplace, p.past_jobs, p.work_experience,
        p.profile_picture_url, p.email_visibility, p.phone_visibility,
        '[]'::json AS images,
        false AS viewer_is_owner,
        $2::boolean AS viewer_is_admin,
        (
          CASE WHEN lower(p.primary_school) = lower(me.primary_school) THEN 1 ELSE 0 END +
          CASE WHEN lower(p.high_school) = lower(me.high_school) THEN 1 ELSE 0 END +
          CASE WHEN lower(p.university) = lower(me.university) THEN 1 ELSE 0 END +
          CASE WHEN lower(p.current_workplace) = lower(me.current_workplace) THEN 1 ELSE 0 END
        ) AS match_score
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       CROSS JOIN me
       WHERE p.user_id <> $1
         AND u.status = 'ACTIVE'
         AND (
          lower(p.primary_school) = lower(me.primary_school)
          OR lower(p.high_school) = lower(me.high_school)
          OR lower(p.university) = lower(me.university)
          OR lower(p.current_workplace) = lower(me.current_workplace)
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
