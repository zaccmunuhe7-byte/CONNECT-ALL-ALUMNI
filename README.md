# CONNECT_ALUMNI

Production-oriented alumni networking platform built as a full-stack monorepo.

## Tech Stack

- **Frontend: React + Vite + TypeScript** for a fast, component-based app with clear client boundaries.
- **Backend: Node.js + Express + TypeScript** for modular REST APIs, middleware-driven security, and real-time Socket.IO messaging.
- **Database: PostgreSQL** because the product needs relational integrity across users, profiles, posts, messages, privacy settings, and moderation.
- **Authentication: JWT access tokens + refresh tokens** with bcrypt password hashing. Access tokens are short-lived; refresh tokens are persisted and revocable.
- **Validation: Zod** to keep request validation explicit at the API boundary.

## Architecture Diagram

```text
Browser React App
  |  REST + JWT
  |  Socket.IO authenticated channel
  v
Express API Gateway
  |-- auth middleware and role checks
  |-- input validation and rate limits
  |-- privacy-aware serializers
  |
  +--> Auth Module       -> users, refresh_tokens, email_verification_tokens
  +--> Profile Module    -> profiles, profile_images, profile_privacy
  +--> Matching/Search   -> profile education and workplace queries
  +--> Messaging Module  -> conversations, conversation_members, messages
  +--> Social Module     -> posts, post_likes, comments
  +--> Admin Module      -> moderation and full-data access
  |
  v
PostgreSQL
```

Sensitive profile fields are protected in backend serializers and SQL access paths. Admin users can access full data; regular users only see private data when viewing themselves.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create PostgreSQL database:

```bash
createdb connect_alumni
psql connect_alumni < database/schema.sql
```

Or run PostgreSQL with Docker:

```bash
docker run --name connect_alumni_postgres \
  -e POSTGRES_DB=connect_alumni \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -v "$PWD/database/schema.sql:/docker-entrypoint-initdb.d/001-schema.sql:ro" \
  -d postgres:16-alpine
```

If Docker Compose is installed, `docker compose up -d postgres` uses the included `docker-compose.yml`.

If Docker is not available, a local PostgreSQL cluster can be run from the system PostgreSQL binaries:

```bash
/usr/lib/postgresql/16/bin/initdb -D .local-postgres
/usr/lib/postgresql/16/bin/pg_ctl -D .local-postgres -l .local-postgres.log -o "-p 5433 -k $PWD/.local-postgres" start
/usr/lib/postgresql/16/bin/createdb -h "$PWD/.local-postgres" -p 5433 connect_alumni
/usr/lib/postgresql/16/bin/psql -h "$PWD/.local-postgres" -p 5433 -d connect_alumni -f database/schema.sql
```

3. Configure environment:

```bash
cp .env.example backend/.env
```

Update `backend/.env` with secure secrets and your database URL.

4. Start both apps:

```bash
npm run dev
```

- API: `http://localhost:4000`
- Frontend: `http://localhost:5173`

## Development Admin

For local development, an admin can be created directly in PostgreSQL and then used at login:

- Email: `admin@connectalumni.local`
- Password: `AdminPass123`

Change this before any real deployment.

## Default API Areas

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/users/me`
- `PATCH /api/profiles/me`
- `GET /api/profiles/:userId`
- `GET /api/connections/suggestions`
- `GET /api/search?school=&workplace=`
- `GET /api/messages/conversations`
- `POST /api/messages/conversations`
- `GET /api/messages/conversations/:conversationId/messages`
- `POST /api/messages/conversations/:conversationId/messages`
- `GET /api/posts`
- `POST /api/posts`
- `POST /api/posts/:postId/like`
- `POST /api/posts/:postId/comments`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:userId/status`
- `PATCH /api/admin/posts/:postId/moderation`

## Security Notes

- Passwords use bcrypt.
- SQL access goes through parameterized `pg` queries.
- Helmet, CORS allowlist, rate limiting, cookie hardening, and request validation are enabled.
- CSRF protection should be enabled if refresh tokens are moved to cookies in production.
- Run behind HTTPS in production and set `NODE_ENV=production`.
- Use object storage such as S3/R2 for media in production; local uploads are for development.
# CONNECT-ALL-ALUMNI
