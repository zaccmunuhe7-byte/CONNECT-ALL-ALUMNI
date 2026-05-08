-- password for all demo users: password123
WITH demo_users(full_name, email, password_hash, role) AS (
  VALUES
    ('Admin User', 'admin@connectalumni.local', '$2a$12$Cx9VbcMDw2ahOCKVyN2U8OHpxxr3icfF4yj901cqSKtIeeKJzTmwO', 'ADMIN'::user_role),
    ('Amina Okoth', 'amina@example.com', '$2a$12$/v1NcDx.Rxh1NtwaJ6Ga2Ofm9iZURCTc2XxRrQCS0LeopyeOEBiVy', 'USER'::user_role),
    ('Brian Mwangi', 'brian@example.com', '$2a$12$/v1NcDx.Rxh1NtwaJ6Ga2Ofm9iZURCTc2XxRrQCS0LeopyeOEBiVy', 'USER'::user_role),
    ('Caroline Njeri', 'caroline@example.com', '$2a$12$/v1NcDx.Rxh1NtwaJ6Ga2Ofm9iZURCTc2XxRrQCS0LeopyeOEBiVy', 'USER'::user_role),
    ('David Kimani', 'david@example.com', '$2a$12$/v1NcDx.Rxh1NtwaJ6Ga2Ofm9iZURCTc2XxRrQCS0LeopyeOEBiVy', 'USER'::user_role),
    ('Esther Wanjiku', 'esther@example.com', '$2a$12$/v1NcDx.Rxh1NtwaJ6Ga2Ofm9iZURCTc2XxRrQCS0LeopyeOEBiVy', 'USER'::user_role)
)
INSERT INTO users (full_name, email, password_hash, role, email_verified_at, last_login_at)
SELECT full_name, email, password_hash, role, now(), now() FROM demo_users
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    status = 'ACTIVE',
    email_verified_at = now(),
    last_login_at = now();

INSERT INTO profiles (user_id)
SELECT id FROM users
WHERE email IN ('admin@connectalumni.local', 'amina@example.com', 'brian@example.com', 'caroline@example.com', 'david@example.com', 'esther@example.com')
ON CONFLICT (user_id) DO NOTHING;

-- Admin profile
UPDATE profiles p SET
  phone_number = '+254700000100',
  primary_school = 'Green Valley Primary',
  primary_school_start_year = 1995,
  primary_school_end_year = 2003,
  high_school = 'Alliance High School',
  high_school_start_year = 2004,
  high_school_end_year = 2007,
  university = 'University of Nairobi',
  university_start_year = 2008,
  university_end_year = 2012,
  current_job = 'Platform Administrator',
  current_workplace = 'Connect Alumni',
  bio = 'Platform admin ensuring safe and productive connections.',
  email_visibility = 'PUBLIC',
  phone_visibility = 'PRIVATE'
FROM users u WHERE p.user_id = u.id AND u.email = 'admin@connectalumni.local';

-- Amina
UPDATE profiles p SET
  phone_number = '+254700000101',
  primary_school = 'Green Valley Primary',
  primary_school_start_year = 1998,
  primary_school_end_year = 2006,
  high_school = 'Sunrise High School',
  high_school_start_year = 2007,
  high_school_end_year = 2010,
  university = 'University of Nairobi',
  university_start_year = 2011,
  university_end_year = 2015,
  current_job = 'Product Manager',
  current_workplace = 'Safaricom',
  work_experience = 'Leads alumni product and community engagement initiatives.',
  bio = 'Passionate about connecting people and building communities. 🌍',
  email_visibility = 'PUBLIC',
  phone_visibility = 'PRIVATE',
  profile_picture_url = '/uploads/default-avatar.png'
FROM users u WHERE p.user_id = u.id AND u.email = 'amina@example.com';

-- Brian
UPDATE profiles p SET
  phone_number = '+254700000102',
  primary_school = 'Green Valley Primary',
  primary_school_start_year = 1998,
  primary_school_end_year = 2006,
  high_school = 'Alliance High School',
  high_school_start_year = 2007,
  high_school_end_year = 2010,
  university = 'Kenyatta University',
  university_start_year = 2011,
  university_end_year = 2015,
  current_job = 'Software Engineer',
  current_workplace = 'Safaricom',
  work_experience = 'Builds secure backend systems and mentoring programs.',
  bio = 'Code. Coffee. Community. Let''s connect! ☕💻',
  email_visibility = 'PRIVATE',
  phone_visibility = 'PRIVATE',
  profile_picture_url = '/uploads/default-avatar.png'
FROM users u WHERE p.user_id = u.id AND u.email = 'brian@example.com';

-- Caroline
UPDATE profiles p SET
  phone_number = '+254700000103',
  primary_school = 'Hillcrest Primary',
  primary_school_start_year = 1999,
  primary_school_end_year = 2007,
  high_school = 'Sunrise High School',
  high_school_start_year = 2008,
  high_school_end_year = 2011,
  university = 'University of Nairobi',
  university_start_year = 2012,
  university_end_year = 2016,
  current_job = 'Data Analyst',
  current_workplace = 'Equity Bank',
  work_experience = 'Analyzes alumni career pathways and scholarship outcomes.',
  bio = 'Numbers tell stories. Let me tell yours. 📊',
  email_visibility = 'PUBLIC',
  phone_visibility = 'PUBLIC',
  profile_picture_url = '/uploads/default-avatar.png'
FROM users u WHERE p.user_id = u.id AND u.email = 'caroline@example.com';

-- David
UPDATE profiles p SET
  phone_number = '+254700000104',
  primary_school = 'Green Valley Primary',
  primary_school_start_year = 1997,
  primary_school_end_year = 2005,
  high_school = 'Starehe Boys Centre',
  high_school_start_year = 2006,
  high_school_end_year = 2009,
  university = 'Strathmore University',
  university_start_year = 2010,
  university_end_year = 2014,
  current_job = 'Business Consultant',
  current_workplace = 'Deloitte',
  work_experience = 'Strategic consulting for East African enterprises.',
  bio = 'Strategy meets execution. Always learning, always growing. 🚀',
  email_visibility = 'PUBLIC',
  phone_visibility = 'PRIVATE',
  profile_picture_url = '/uploads/default-avatar.png'
FROM users u WHERE p.user_id = u.id AND u.email = 'david@example.com';

-- Esther
UPDATE profiles p SET
  phone_number = '+254700000105',
  primary_school = 'Hillcrest Primary',
  primary_school_start_year = 1999,
  primary_school_end_year = 2007,
  high_school = 'Alliance High School',
  high_school_start_year = 2008,
  high_school_end_year = 2011,
  university = 'University of Nairobi',
  university_start_year = 2012,
  university_end_year = 2016,
  university_current = false,
  current_job = 'UX Designer',
  current_workplace = 'Google',
  work_experience = 'Designing inclusive digital experiences for African markets.',
  bio = 'Design is not just what it looks like. Design is how it works. 🎨',
  email_visibility = 'PUBLIC',
  phone_visibility = 'PUBLIC',
  profile_picture_url = '/uploads/default-avatar.png'
FROM users u WHERE p.user_id = u.id AND u.email = 'esther@example.com';

-- Sample posts
INSERT INTO posts (author_id, body)
SELECT id, 'Excited to reconnect with classmates and support new graduates. The alumni network is truly powerful! 🎓' FROM users WHERE email = 'amina@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO posts (author_id, body)
SELECT id, 'Looking for alumni working in fintech and education technology. Let''s build something amazing together! 💡' FROM users WHERE email = 'brian@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO posts (author_id, body)
SELECT id, 'Just attended an amazing reunion event. So many familiar faces from University of Nairobi! 🏫' FROM users WHERE email = 'caroline@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO posts (author_id, body)
SELECT id, 'Proud to see so many Green Valley Primary alumni making waves in the tech industry! Keep pushing! 🌟' FROM users WHERE email = 'david@example.com'
ON CONFLICT DO NOTHING;

-- Sample opportunity
INSERT INTO opportunities (author_id, title, description, company, location, opportunity_type)
SELECT id, 'Senior Software Engineer', 'We are looking for experienced engineers to join our mobile money team. Must have 3+ years experience with Node.js and React.', 'Safaricom', 'Nairobi, Kenya', 'Job'
FROM users WHERE email = 'amina@example.com';

INSERT INTO opportunities (author_id, title, description, company, location, opportunity_type)
SELECT id, 'Data Science Intern', 'Summer internship opportunity for final year students interested in financial data analytics.', 'Equity Bank', 'Nairobi, Kenya', 'Internship'
FROM users WHERE email = 'caroline@example.com';

-- Sample connections
INSERT INTO connections (requester_id, addressee_id, status)
SELECT a.id, b.id, 'ACCEPTED'
FROM users a, users b
WHERE a.email = 'amina@example.com' AND b.email = 'brian@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO connections (requester_id, addressee_id, status)
SELECT a.id, b.id, 'ACCEPTED'
FROM users a, users b
WHERE a.email = 'amina@example.com' AND b.email = 'caroline@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO connections (requester_id, addressee_id, status)
SELECT a.id, b.id, 'PENDING'
FROM users a, users b
WHERE a.email = 'david@example.com' AND b.email = 'amina@example.com'
ON CONFLICT DO NOTHING;
