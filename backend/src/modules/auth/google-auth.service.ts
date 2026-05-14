import { OAuth2Client } from 'google-auth-library';
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

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

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

/**
 * Authenticate with Google. Verifies the Google ID token, finds or creates the user,
 * and returns the same session shape as email/password login.
 */
export async function loginWithGoogle(credential: string) {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new AppError(500, 'Google authentication is not configured', 'GOOGLE_NOT_CONFIGURED');
  }

  // Verify the Google ID token
  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID
    });
    payload = ticket.getPayload();
  } catch {
    throw new AppError(401, 'Invalid Google credential', 'INVALID_GOOGLE_TOKEN');
  }

  if (!payload || !payload.email) {
    throw new AppError(401, 'Google token missing email', 'INVALID_GOOGLE_TOKEN');
  }

  const { email, name, picture, sub } = payload;

  // Check if user already exists by email
  const existing = await query<DbUser>(
    'SELECT id, full_name, email, password_hash, role, status FROM users WHERE email = $1',
    [email]
  );

  let user: DbUser;

  if (existing.rowCount && existing.rows[0]) {
    user = existing.rows[0];

    // Link Google sub if not already linked
    if (sub) {
      await query('UPDATE users SET google_sub = COALESCE(google_sub, $1) WHERE id = $2', [sub, user.id]);
    }

    // Check account status
    if (user.status === 'SUSPENDED') {
      throw new AppError(403, 'Your account has been suspended. Please contact the admin.', 'ACCOUNT_SUSPENDED');
    }
    if (user.status === 'DELETED') {
      throw new AppError(403, 'Your account has been deleted. Please contact the admin.', 'ACCOUNT_DELETED');
    }
  } else {
    // Create new user (no password — use sentinel hash that can't be matched by bcrypt)
    const sentinelHash = `GOOGLE_AUTH_${crypto.randomUUID()}`;
    const result = await query<DbUser>(
      `INSERT INTO users (full_name, email, password_hash, google_sub, last_login_at, email_verified_at)
       VALUES ($1, $2, $3, $4, now(), now())
       RETURNING id, full_name, email, password_hash, role, status`,
      [name || email.split('@')[0], email, sentinelHash, sub]
    );
    user = result.rows[0];

    // Create profile with Google picture
    await query(
      `INSERT INTO profiles (user_id, profile_picture_url)
       VALUES ($1, COALESCE($2, '/uploads/default-avatar.png'))`,
      [user.id, picture || null]
    );
  }

  // Track last login
  await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);

  const authUser = { id: user.id, email: user.email, role: user.role };
  const refreshToken = createRefreshToken();
  await persistRefreshToken(user.id, refreshToken);

  return {
    accessToken: signAccessToken(authUser),
    refreshToken,
    user: { ...authUser, fullName: user.full_name }
  };
}
