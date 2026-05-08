import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { query } from '../../db/pool.js';

export const opportunityRouter = Router();
opportunityRouter.use(requireAuth);

// List opportunities
opportunityRouter.get('/', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT o.id, o.title, o.description, o.company, o.location, o.opportunity_type AS "opportunityType",
        o.created_at AS "createdAt",
        json_build_object('id', u.id, 'fullName', u.full_name, 'profilePictureUrl', pr.profile_picture_url) AS author
       FROM opportunities o
       JOIN users u ON u.id = o.author_id
       JOIN profiles pr ON pr.user_id = u.id
       WHERE u.status = 'ACTIVE'
       ORDER BY o.created_at DESC
       LIMIT 50`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Create opportunity
opportunityRouter.post('/', validate(z.object({
  body: z.object({
    title: z.string().min(2).max(200),
    description: z.string().min(10).max(5000),
    company: z.string().min(1).max(200),
    location: z.string().max(200).optional(),
    opportunityType: z.string().max(50).default('Job')
  })
})), async (req, res, next) => {
  try {
    const result = await query(
      `INSERT INTO opportunities (author_id, title, description, company, location, opportunity_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, description, company, location, opportunity_type AS "opportunityType", created_at AS "createdAt"`,
      [req.user!.id, req.body.title, req.body.description, req.body.company, req.body.location, req.body.opportunityType]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete own opportunity
opportunityRouter.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM opportunities WHERE id = $1 AND author_id = $2 RETURNING id',
      [req.params.id, req.user!.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: { message: 'Opportunity not found' } });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
