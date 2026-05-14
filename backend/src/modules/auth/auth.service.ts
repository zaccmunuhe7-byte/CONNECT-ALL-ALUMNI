import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { query } from '../../db/pool.js';
import { env } from '../../config/env.js';
import { sendOtpEmail } from '../../utils/mailer.js';
import { AppError } from '../../utils/errors.js';
import type { AuthUser } from '../../middleware/auth.js';

type DbUser = {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: 'USER' | 'ADMIN';
  status: string;
  status_reason?: string;
};

function signAccessToken(user: AuthUser) {
  const options: jwt.SignOptions = { expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'] };
  return jwt.sign(user, env.JWT_ACCESS_SECRET, options);
}

function createRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

async function persistRefreshToken(userId: string, token: string) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + interval '7 days')`,
    [userId, tokenHash]
  );
}

export async function register(input: {
  fullName: string;
  email: string;
  password: string;
  primarySchool: string;
  highSchool: string;
  university?: string;
  currentWorkplace?: string;
  bio?: string;
  profilePictureUrl?: string;
}) {
  const existing = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [input.email]);
  if (existing.rowCount) throw new AppError(409, 'Email is already registered', 'EMAIL_EXISTS');

  const passwordHash = await bcrypt.hash(input.password, 12);
  const result = await query<DbUser>(
    `INSERT INTO users (full_name, email, password_hash, last_login_at)
     VALUES ($1, $2, $3, now())
     RETURNING id, full_name, email, password_hash, role, status`,
    [input.fullName, input.email, passwordHash]
  );

  const user = result.rows[0];

  // Create profile with school info, bio, and profile picture
  await query(
    `INSERT INTO profiles (user_id, primary_school, high_school, university, current_workplace, bio, profile_picture_url)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, '/uploads/default-avatar.png'))`,
    [
      user.id,
      input.primarySchool,
      input.highSchool,
      input.university || null,
      input.currentWorkplace || null,
      input.bio || null,
      input.profilePictureUrl || null
    ]
  );

  const authUser = { id: user.id, email: user.email, role: user.role };
  const refreshToken = createRefreshToken();
  await persistRefreshToken(user.id, refreshToken);

  return { accessToken: signAccessToken(authUser), refreshToken, user: { ...authUser, fullName: user.full_name } };
}

export async function login(input: { email: string; password: string }) {
  const result = await query<DbUser>(
    'SELECT id, full_name, email, password_hash, role, status, status_reason FROM users WHERE email = $1',
    [input.email]
  );
  const user = result.rows[0];

  // User not found — generic "not found" error
  if (!user) throw new AppError(401, 'No account found with this email address', 'USER_NOT_FOUND');

  // Account is suspended
  if (user.status === 'SUSPENDED') {
    throw new AppError(403,
      `Your account has been suspended${user.status_reason ? ': ' + user.status_reason : ''}. Please contact the admin to request reactivation.`,
      'ACCOUNT_SUSPENDED'
    );
  }

  // Account is deleted
  if (user.status === 'DELETED') {
    throw new AppError(403,
      `Your account has been permanently deleted${user.status_reason ? ': ' + user.status_reason : ''}. Please contact the admin if you wish to be reinstated.`,
      'ACCOUNT_DELETED'
    );
  }

  const ok = await bcrypt.compare(input.password, user.password_hash);
  if (!ok) throw new AppError(401, 'Wrong password. Please try again or reset your password.', 'WRONG_PASSWORD');

  // Track last login
  await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);

  const authUser = { id: user.id, email: user.email, role: user.role };
  const refreshToken = createRefreshToken();
  await persistRefreshToken(user.id, refreshToken);
  return { accessToken: signAccessToken(authUser), refreshToken, user: { ...authUser, fullName: user.full_name } };
}

export async function refresh(refreshToken: string) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const result = await query<DbUser>(
    `SELECT u.id, u.full_name, u.email, u.password_hash, u.role, u.status
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > now()`,
    [tokenHash]
  );
  const user = result.rows[0];
  if (!user || user.status !== 'ACTIVE') throw new AppError(401, 'Invalid refresh token', 'INVALID_REFRESH');

  await query('UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1', [tokenHash]);
  const nextRefreshToken = createRefreshToken();
  await persistRefreshToken(user.id, nextRefreshToken);
  const authUser = { id: user.id, email: user.email, role: user.role };
  return { accessToken: signAccessToken(authUser), refreshToken: nextRefreshToken, user: authUser };
}

export async function submitAppeal(input: { email: string; password: string; reason: string }) {
  const result = await query<DbUser>(
    'SELECT id, password_hash, status FROM users WHERE email = $1',
    [input.email]
  );
  const user = result.rows[0];
  if (!user) throw new AppError(401, 'No account found with this email address', 'USER_NOT_FOUND');

  const ok = await bcrypt.compare(input.password, user.password_hash);
  if (!ok) throw new AppError(401, 'Wrong password', 'WRONG_PASSWORD');

  if (user.status === 'ACTIVE') {
    throw new AppError(400, 'This account is not suspended or deleted.', 'ACCOUNT_ACTIVE');
  }

  await query('UPDATE users SET appeal_reason = $1, updated_at = now() WHERE id = $2', [input.reason, user.id]);

  return { message: 'Your appeal has been submitted to the admin for review.' };
}

// ─── Forgot Password Flow ─────────────────────

/** Generate a 6-digit OTP */
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Request password reset — generates OTP and "sends" via email/sms (console log for now) */
export async function requestPasswordReset(input: { identifier: string }) {
  const { identifier } = input;

  // Try to find user by email or phone
  const result = await query<DbUser & { phone_number?: string }>(
    `SELECT u.id, u.full_name, u.email, u.status, p.phone_number
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.email = $1 OR p.phone_number = $1`,
    [identifier]
  );
  const user = result.rows[0];
  if (!user) throw new AppError(404, 'No account found with that email or phone number', 'USER_NOT_FOUND');
  if (user.status !== 'ACTIVE') throw new AppError(403, 'This account is not active', 'ACCOUNT_INACTIVE');

  // Invalidate any previous unused tokens
  await query(
    `UPDATE password_reset_tokens SET used_at = now()
     WHERE user_id = $1 AND used_at IS NULL`,
    [user.id]
  );

  const otp = generateOtp();
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  const method = identifier.includes('@') ? 'email' : 'sms';

  await query(
    `INSERT INTO password_reset_tokens (user_id, otp_hash, method, expires_at)
     VALUES ($1, $2, $3, now() + interval '10 minutes')`,
    [user.id, otpHash, method]
  );

  // Send OTP via email (real email) or SMS (console log for now)
  if (method === 'email') {
    await sendOtpEmail(user.email, otp, user.full_name);
  } else {
    console.log(`\n📱 PASSWORD RESET OTP sent to ${identifier}: ${otp}\n`);
  }

  // Return masked info to the frontend
  const maskedEmail = user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
  const maskedPhone = user.phone_number ? user.phone_number.replace(/(.{3})(.*)(.{2})/, '$1***$3') : undefined;

  return {
    method,
    destination: method === 'email' ? maskedEmail : maskedPhone,
    message: `A 6-digit OTP has been sent to your ${method}. It expires in 10 minutes.`
  };
}

/** Verify OTP and return a temporary reset token */
export async function verifyOtp(input: { identifier: string; otp: string }) {
  const otpHash = crypto.createHash('sha256').update(input.otp).digest('hex');

  const result = await query<{ id: string; user_id: string }>(
    `SELECT prt.id, prt.user_id
     FROM password_reset_tokens prt
     JOIN users u ON u.id = prt.user_id
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE (u.email = $1 OR p.phone_number = $1)
       AND prt.otp_hash = $2
       AND prt.used_at IS NULL
       AND prt.expires_at > now()
     ORDER BY prt.created_at DESC LIMIT 1`,
    [input.identifier, otpHash]
  );

  if (!result.rowCount) throw new AppError(400, 'Invalid or expired OTP. Please request a new one.', 'INVALID_OTP');

  // Generate a temporary reset token (JWT, valid 5 minutes)
  const resetToken = jwt.sign(
    { userId: result.rows[0].user_id, tokenId: result.rows[0].id },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '5m' }
  );

  return { resetToken, message: 'OTP verified. You can now set a new password.' };
}

/** Reset password using the temporary reset token */
export async function resetPassword(input: { resetToken: string; newPassword: string }) {
  let payload: { userId: string; tokenId: string };
  try {
    payload = jwt.verify(input.resetToken, env.JWT_ACCESS_SECRET) as { userId: string; tokenId: string };
  } catch {
    throw new AppError(400, 'Reset token expired. Please request a new OTP.', 'EXPIRED_RESET_TOKEN');
  }

  // Verify token hasn't been used
  const tokenCheck = await query(
    'SELECT id FROM password_reset_tokens WHERE id = $1 AND used_at IS NULL',
    [payload.tokenId]
  );
  if (!tokenCheck.rowCount) throw new AppError(400, 'This reset link has already been used', 'TOKEN_USED');

  // Hash new password and update
  const passwordHash = await bcrypt.hash(input.newPassword, 12);
  await query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [passwordHash, payload.userId]);

  // Mark token as used
  await query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [payload.tokenId]);

  // Revoke all existing refresh tokens for security
  await query('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [payload.userId]);

  return { message: 'Password has been reset successfully. You can now login with your new password.' };
}
