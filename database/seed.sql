WITH demo_users(full_name, email, password_hash, role) AS (
  VALUES
    ('Admin User', 'admin@connectalumni.local', '$2a$12$Cx9VbcMDw2ahOCKVyN2U8OHpxxr3icfF4yj901cqSKtIeeKJzTmwO', 'ADMIN'::user_role),
    ('Amina Okoth', 'amina@example.com', '$2a$12$/v1NcDx.Rxh1NtwaJ6Ga2Ofm9iZURCTc2XxRrQCS0LeopyeOEBiVy', 'USER'::user_role),
    ('Brian Mwangi', 'brian@example.com', '$2a$12$/v1NcDx.Rxh1NtwaJ6Ga2Ofm9iZURCTc2XxRrQCS0LeopyeOEBiVy', 'USER'::user_role),
    ('Caroline Njeri', 'caroline@example.com', '$2a$12$/v1NcDx.Rxh1NtwaJ6Ga2Ofm9iZURCTc2XxRrQCS0LeopyeOEBiVy', 'USER'::user_role)
)
INSERT INTO users (full_name, email, password_hash, role, email_verified_at)
SELECT full_name, email, password_hash, role, now() FROM demo_users
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    status = 'ACTIVE',
    email_verified_at = now();

INSERT INTO profiles (user_id)
SELECT id FROM users
WHERE email IN ('admin@connectalumni.local', 'amina@example.com', 'brian@example.com', 'caroline@example.com')
ON CONFLICT (user_id) DO NOTHING;

UPDATE profiles p SET
  phone_number = '+254700000101',
  primary_school = 'Green Valley Primary',
  high_school = 'Sunrise High School',
  university = 'University of Nairobi',
  current_job = 'Product Manager',
  current_workplace = 'Safaricom',
  work_experience = 'Leads alumni product and community engagement initiatives.',
  email_visibility = 'PUBLIC',
  phone_visibility = 'PRIVATE',
  profile_picture_url = '/uploads/default-avatar.png'
FROM users u WHERE p.user_id = u.id AND u.email = 'amina@example.com';

UPDATE profiles p SET
  phone_number = '+254700000102',
  primary_school = 'Green Valley Primary',
  high_school = 'Alliance High School',
  university = 'Kenyatta University',
  current_job = 'Software Engineer',
  current_workplace = 'Safaricom',
  work_experience = 'Builds secure backend systems and mentoring programs.',
  email_visibility = 'PRIVATE',
  phone_visibility = 'PRIVATE',
  profile_picture_url = '/uploads/default-avatar.png'
FROM users u WHERE p.user_id = u.id AND u.email = 'brian@example.com';

UPDATE profiles p SET
  phone_number = '+254700000103',
  primary_school = 'Hillcrest Primary',
  high_school = 'Sunrise High School',
  university = 'University of Nairobi',
  current_job = 'Data Analyst',
  current_workplace = 'Equity Bank',
  work_experience = 'Analyzes alumni career pathways and scholarship outcomes.',
  email_visibility = 'PUBLIC',
  phone_visibility = 'PUBLIC',
  profile_picture_url = '/uploads/default-avatar.png'
FROM users u WHERE p.user_id = u.id AND u.email = 'caroline@example.com';

INSERT INTO posts (author_id, body)
SELECT id, 'Excited to reconnect with classmates and support new graduates.' FROM users WHERE email = 'amina@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO posts (author_id, body)
SELECT id, 'Looking for alumni working in fintech and education technology.' FROM users WHERE email = 'brian@example.com'
ON CONFLICT DO NOTHING;
