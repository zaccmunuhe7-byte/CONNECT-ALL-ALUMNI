import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { query } from '../../db/pool.js';
import { AppError } from '../../utils/errors.js';
import { serializeProfile } from './profile.serializer.js';
import { upload } from '../../middleware/upload.js';

export const profileRouter = Router();
profileRouter.use(requireAuth);

const profileSelect = `
  SELECT u.id AS user_id, u.full_name, u.email, u.role, u.status, u.date_of_birth,
    p.phone_number, p.primary_school, p.high_school, p.university,
    p.primary_school_start_year, p.primary_school_end_year, p.primary_school_current,
    p.high_school_start_year, p.high_school_end_year, p.high_school_current,
    p.university_start_year, p.university_end_year, p.university_current,
    p.current_job, p.current_workplace, p.past_jobs, p.work_experience,
    p.profile_picture_url, p.email_visibility, p.phone_visibility, p.dob_visibility,
    p.bio,
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
    dateOfBirth: z.string().optional().nullable(),
    primarySchool: z.string().max(160).optional().nullable(),
    primarySchoolStartYear: z.coerce.number().int().min(1900).max(2200).optional().nullable(),
    primarySchoolEndYear: z.coerce.number().int().min(1900).max(2200).optional().nullable(),
    primarySchoolCurrent: z.boolean().optional(),
    highSchool: z.string().max(160).optional().nullable(),
    highSchoolStartYear: z.coerce.number().int().min(1900).max(2200).optional().nullable(),
    highSchoolEndYear: z.coerce.number().int().min(1900).max(2200).optional().nullable(),
    highSchoolCurrent: z.boolean().optional(),
    university: z.string().max(160).optional().nullable(),
    universityStartYear: z.coerce.number().int().min(1900).max(2200).optional().nullable(),
    universityEndYear: z.coerce.number().int().min(1900).max(2200).optional().nullable(),
    universityCurrent: z.boolean().optional(),
    currentJob: z.string().max(160).optional().nullable(),
    currentWorkplace: z.string().max(160).optional().nullable(),
    pastJobs: z.array(z.object({
      title: z.string().max(120),
      company: z.string().max(160),
      startYear: z.number().int().min(1900).max(2200).optional(),
      endYear: z.number().int().min(1900).max(2200).optional()
    })).optional(),
    workExperience: z.string().max(3000).optional().nullable(),
    bio: z.string().max(50).optional().nullable(),
    profilePictureUrl: z.string().optional(),
    emailVisibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
    phoneVisibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
    dobVisibility: z.enum(['PUBLIC', 'PRIVATE']).optional()
  })
})), async (req, res, next) => {
  try {
    const body = req.body;
    if (body.fullName || body.dateOfBirth !== undefined) {
      const sets: string[] = ['updated_at = now()'];
      const vals: unknown[] = [];
      if (body.fullName) { vals.push(body.fullName); sets.push(`full_name = $${vals.length}`); }
      if (body.dateOfBirth !== undefined) { vals.push(body.dateOfBirth); sets.push(`date_of_birth = $${vals.length}`); }
      vals.push(req.user!.id);
      await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);
    }
    await query(
      `UPDATE profiles SET
        phone_number = COALESCE($1, phone_number),
        primary_school = COALESCE($2, primary_school),
        primary_school_start_year = COALESCE($3, primary_school_start_year),
        primary_school_end_year = COALESCE($4, primary_school_end_year),
        primary_school_current = COALESCE($5, primary_school_current),
        high_school = COALESCE($6, high_school),
        high_school_start_year = COALESCE($7, high_school_start_year),
        high_school_end_year = COALESCE($8, high_school_end_year),
        high_school_current = COALESCE($9, high_school_current),
        university = COALESCE($10, university),
        university_start_year = COALESCE($11, university_start_year),
        university_end_year = COALESCE($12, university_end_year),
        university_current = COALESCE($13, university_current),
        current_job = COALESCE($14, current_job),
        current_workplace = COALESCE($15, current_workplace),
        past_jobs = COALESCE($16, past_jobs),
        work_experience = COALESCE($17, work_experience),
        profile_picture_url = COALESCE($18, profile_picture_url),
        email_visibility = COALESCE($19, email_visibility),
        phone_visibility = COALESCE($20, phone_visibility),
        dob_visibility = COALESCE($21, dob_visibility),
        bio = COALESCE($22, bio),
        updated_at = now()
      WHERE user_id = $23`,
      [
        body.phoneNumber, body.primarySchool,
        body.primarySchoolStartYear, body.primarySchoolEndYear, body.primarySchoolCurrent,
        body.highSchool,
        body.highSchoolStartYear, body.highSchoolEndYear, body.highSchoolCurrent,
        body.university,
        body.universityStartYear, body.universityEndYear, body.universityCurrent,
        body.currentJob, body.currentWorkplace,
        body.pastJobs ? JSON.stringify(body.pastJobs) : null,
        body.workExperience, body.profilePictureUrl, body.emailVisibility,
        body.phoneVisibility, body.dobVisibility, body.bio,
        req.user!.id
      ]
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Upload profile picture
profileRouter.post('/me/avatar', upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError(400, 'No file uploaded', 'NO_FILE');
    const url = `/uploads/${req.file.filename}`;
    await query('UPDATE profiles SET profile_picture_url = $1, updated_at = now() WHERE user_id = $2', [url, req.user!.id]);
    res.json({ url });
  } catch (error) {
    next(error);
  }
});

profileRouter.post('/me/images', validate(z.object({
  body: z.object({ imageUrl: z.string(), visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PRIVATE') })
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
