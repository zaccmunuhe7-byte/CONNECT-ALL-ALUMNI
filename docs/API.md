# REST API

All protected endpoints require `Authorization: Bearer <access_token>`.

## Auth

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create user, profile, refresh token |
| POST | `/api/auth/login` | Verify credentials |
| POST | `/api/auth/refresh` | Rotate refresh token |
| POST | `/api/auth/logout` | Revoke refresh token |
| POST | `/api/auth/verify-email` | Optional email verification |

## Profiles

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/users/me` | Current user with private fields |
| PATCH | `/api/profiles/me` | Update profile and privacy controls |
| GET | `/api/profiles/:userId` | Privacy-aware public profile |
| POST | `/api/profiles/me/images` | Add image |
| PATCH | `/api/profiles/me/images/:imageId` | Change image visibility |

## Alumni Discovery

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/connections/suggestions` | People you may know |
| GET | `/api/search?school=&workplace=` | Search registered alumni |

## Messaging

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/messages/conversations` | List conversations |
| POST | `/api/messages/conversations` | Create/find 1:1 conversation |
| GET | `/api/messages/conversations/:conversationId/messages` | Read chat history |
| POST | `/api/messages/conversations/:conversationId/messages` | Send message |

Socket event: `message:new` is emitted to authenticated conversation members.

## Social

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/posts` | Feed |
| POST | `/api/posts` | Create post |
| POST | `/api/posts/:postId/like` | Toggle like |
| POST | `/api/posts/:postId/comments` | Add comment |

## Admin

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/admin/users` | View all users and private data |
| PATCH | `/api/admin/users/:userId/status` | Suspend/reactivate users |
| PATCH | `/api/admin/posts/:postId/moderation` | Hide/remove posts |
