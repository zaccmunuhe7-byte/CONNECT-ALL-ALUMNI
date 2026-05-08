-- Migration: Features V2
-- Password reset tokens, notifications, username change tracking, account action reasons

-- ══════════════════════════════════════════════
-- Password Reset OTP tokens
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_hash TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'email',  -- 'email' or 'sms'
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens (user_id, expires_at);

-- ══════════════════════════════════════════════
-- Notifications table
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,             -- 'connection_accepted', 'account_suspended', 'account_deleted', etc.
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  reference_id UUID,              -- optional FK to related entity
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (user_id) WHERE is_read = false;

-- ══════════════════════════════════════════════
-- Username change tracking
-- ══════════════════════════════════════════════
ALTER TABLE users ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMPTZ;

-- ══════════════════════════════════════════════
-- Suspension / deletion reason
-- ══════════════════════════════════════════════
ALTER TABLE users ADD COLUMN IF NOT EXISTS status_reason TEXT;
