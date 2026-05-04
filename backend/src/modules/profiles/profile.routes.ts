import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { query } from '../../db/pool.js';
import { AppError } from '../../utils/errors.js';
import { serializeProfile } from './profile.serializer.js';

export const profileRouter = Router();
profileRouter.use(requireAuth);

const profileSelect = `
  SELECT u.id AS user_id, u.full_name, u.email, u.role, u.status,
    p.phone_number, p.primary_school, p.high_school, p.university,
    p.current_job, p.current_workplace, p.past_jobs, p.work_experience,
    p.profile_picture_url, p.email_visibility, p.phone_visibility,
    COALESCE(json_agg(json_build_object('id', pi.id, 'url', pi.image_url, 'visibility', pi.visibility))
      FILTER (WHERE pi.id IS NOT NULL AND ($2::boolean OR pi.visibility = 'PUBLIC')), '[]') AS images,
    (u.id = $1) AS viewer_is_owner,
    $2::boolean AS viewer_is_admin
  FROM users u
  JOIN profiles p ON p.user_id = u.id
  LEFT JOIN profile_images pi ON pi.user_id = u.id
`;

profileRouter.get('/me', async (req, res, next) => {
  try {
    const result = await query(`${profileSelect} WHERE u.id = $1 GROUP BY u.id, p.user_id`, [
      req.user!.id,
      req.user!.role === 'ADMIN'
    ]);
    res.json(serializeProfile(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

profileRouter.get('/:userId', async (req, res, next) => {
  try {
    const isAdmin = req.user!.role === 'ADMIN';
    const result = await query(`${profileSelect} WHERE u.id = $3 AND u.status = 'ACTIVE' GROUP BY u.id, p.user_id`, [
      req.user!.id,
      isAdmin,
      req.params.userId
    ]);
    if (!result.rowCount) throw new AppError(404, 'Profile not found', 'PROFILE_NOT_FOUND');
    res.json(serializeProfile(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

profileRouter.patch('/me', validate(z.object({
  body: z.object({
    fullName: z.string().min(2).max(120).optional(),
    phoneNumber: z.string().max(40).optional().nullable(),
    primarySchool: z.string().max(160).optional().nullable(),
    highSchool: z.string().max(160).optional().nullable(),
    university: z.string().max(160).optional().nullable(),
    currentJob: z.string().max(160).optional().nullable(),
    currentWorkplace: z.string().max(160).optional().nullable(),
    pastJobs: z.array(z.object({
      title: z.string().max(120),
      company: z.string().max(160),
      startYear: z.number().int().min(1900).max(2200).optional(),
      endYear: z.number().int().min(1900).max(2200).optional()
    })).optional(),
    workExperience: z.string().max(3000).optional().nullable(),
    profilePictureUrl: z.string().url().optional(),
    emailVisibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
    phoneVisibility: z.enum(['PUBLIC', 'PRIVATE']).optional()
  })
})), async (req, res, next) => {
  try {
    const body = req.body;
    if (body.fullName) {
      await query('UPDATE users SET full_name = $1, updated_at = now() WHERE id = $2', [body.fullName, req.user!.id]);
    }
    await query(
      `UPDATE profiles SET
        phone_number = COALESCE($1, phone_number),
        primary_school = COALESCE($2, primary_school),
        high_school = COALESCE($3, high_school),
        university = COALESCE($4, university),
        current_job = COALESCE($5, current_job),
        current_workplace = COALESCE($6, current_workplace),
        past_jobs = COALESCE($7, past_jobs),
        work_experience = COALESCE($8, work_experience),
        profile_picture_url = COALESCE($9, profile_picture_url),
        email_visibility = COALESCE($10, email_visibility),
        phone_visibility = COALESCE($11, phone_visibility),
        updated_at = now()
      WHERE user_id = $12`,
      [
        body.phoneNumber, body.primarySchool, body.highSchool, body.university,
        body.currentJob, body.currentWorkplace,
        body.pastJobs ? JSON.stringify(body.pastJobs) : null,
        body.workExperience, body.profilePictureUrl, body.emailVisibility,
        body.phoneVisibility, req.user!.id
      ]
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

profileRouter.post('/me/images', validate(z.object({
  body: z.object({ imageUrl: z.string().url(), visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PRIVATE') })
})), async (req, res, next) => {
  try {
    const result = await query(
      `INSERT INTO profile_images (user_id, image_url, visibility) VALUES ($1, $2, $3) RETURNING id, image_url, visibility`,
      [req.user!.id, req.body.imageUrl, req.body.visibility]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});
