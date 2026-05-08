-- Migration: Add post visibility, reactions, and admin user

-- Add post_visibility enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_visibility') THEN
    CREATE TYPE post_visibility AS ENUM ('EVERYONE', 'CONNECTIONS');
  END IF;
END$$;

-- Add reaction_type enum if not exists  
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reaction_type') THEN
    CREATE TYPE reaction_type AS ENUM ('like', 'love', 'clap', 'wow', 'fire');
  END IF;
END$$;

-- Add visibility column to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS visibility post_visibility NOT NULL DEFAULT 'EVERYONE';

-- Create post_reactions table (replacing post_likes)
CREATE TABLE IF NOT EXISTS post_reactions (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction reaction_type NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- Migrate existing likes to reactions
INSERT INTO post_reactions (post_id, user_id, reaction, created_at)
SELECT post_id, user_id, 'like', created_at FROM post_likes
ON CONFLICT DO NOTHING;

-- Seed admin user (password: AdminPass123)
-- bcrypt hash for AdminPass123 with 12 rounds
INSERT INTO users (full_name, email, password_hash, role, last_login_at)
VALUES (
  'Admin',
  'alumniconnectadmin@',
  '$2a$12$JG4Co5NTWBe2jrEepardpuWDZP66MGrJOByGxJQnq3iNuxcjTsxVi',
  'ADMIN',
  now()
)
ON CONFLICT (email) DO UPDATE SET role = 'ADMIN';

-- Create profile for admin if not exists
INSERT INTO profiles (user_id, bio)
SELECT id, 'Platform Administrator'
FROM users WHERE email = 'alumniconnectadmin@'
ON CONFLICT (user_id) DO NOTHING;
