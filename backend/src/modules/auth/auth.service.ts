import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { query } from '../../db/pool.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';
import type { AuthUser } from '../../middleware/auth.js';

type DbUser = {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: 'USER' | 'ADMIN';
  status: string;
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

  return { accessToken: signAccessToken(authUser), refreshToken, user: authUser };
}

export async function login(input: { email: string; password: string }) {
  const result = await query<DbUser>(
    'SELECT id, full_name, email, password_hash, role, status FROM users WHERE email = $1',
    [input.email]
  );
  const user = result.rows[0];
  if (!user || user.status !== 'ACTIVE') throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');

  const ok = await bcrypt.compare(input.password, user.password_hash);
  if (!ok) throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');

  // Track last login
  await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);

  const authUser = { id: user.id, email: user.email, role: user.role };
  const refreshToken = createRefreshToken();
  await persistRefreshToken(user.id, refreshToken);
  return { accessToken: signAccessToken(authUser), refreshToken, user: authUser };
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
