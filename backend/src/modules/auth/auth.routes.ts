import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import * as service from './auth.service.js';

export const authRouter = Router();

const registerSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(120),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    primarySchool: z.string().min(2).max(160),
    highSchool: z.string().min(2).max(160),
    university: z.string().max(160).optional().default(''),
    currentWorkplace: z.string().max(160).optional().default(''),
    bio: z.string().max(50).optional().default(''),
    profilePictureUrl: z.string().optional()
  })
});

authRouter.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    res.status(201).json(await service.register(req.body));
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', validate(z.object({
  body: z.object({ email: z.string().email(), password: z.string().min(1) })
})), async (req, res, next) => {
  try {
    res.json(await service.login(req.body));
  } catch (error) {
    next(error);
  }
});

authRouter.post('/refresh', validate(z.object({
  body: z.object({ refreshToken: z.string().min(32) })
})), async (req, res, next) => {
  try {
    res.json(await service.refresh(req.body.refreshToken));
  } catch (error) {
    next(error);
  }
});

authRouter.post('/appeal', validate(z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
    reason: z.string().min(10).max(1000)
  })
})), async (req, res, next) => {
  try {
    res.json(await service.submitAppeal(req.body));
  } catch (error) {
    next(error);
  }
});

// ─── Forgot Password Flow ─────────────────────

// Step 1: Request password reset OTP
authRouter.post('/forgot-password', validate(z.object({
  body: z.object({
    identifier: z.string().min(3).max(255)  // email or phone number
  })
})), async (req, res, next) => {
  try {
    res.json(await service.requestPasswordReset(req.body));
  } catch (error) {
    next(error);
  }
});

// Step 2: Verify OTP
authRouter.post('/verify-otp', validate(z.object({
  body: z.object({
    identifier: z.string().min(3).max(255),
    otp: z.string().length(6)
  })
})), async (req, res, next) => {
  try {
    res.json(await service.verifyOtp(req.body));
  } catch (error) {
    next(error);
  }
});

// Step 3: Reset password
authRouter.post('/reset-password', validate(z.object({
  body: z.object({
    resetToken: z.string().min(10),
    newPassword: z.string().min(8).max(128)
  })
})), async (req, res, next) => {
  try {
    res.json(await service.resetPassword(req.body));
  } catch (error) {
    next(error);
  }
});
