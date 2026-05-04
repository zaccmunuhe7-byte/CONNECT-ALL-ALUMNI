import compression from 'compression';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config/env.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { userRouter } from './modules/users/user.routes.js';
import { profileRouter } from './modules/profiles/profile.routes.js';
import { connectionRouter } from './modules/connections/connection.routes.js';
import { searchRouter } from './modules/search/search.routes.js';
import { messageRouter } from './modules/messages/message.routes.js';
import { postRouter } from './modules/posts/post.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { errorHandler, notFound } from './utils/errors.js';

function allowCorsOrigin(origin: string | undefined, callback: (err: Error | null, origin?: boolean) => void) {
  if (!origin || env.CLIENT_ORIGINS.includes(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error('Origin not allowed by CORS'));
}

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(compression());
  app.use(cors({ origin: allowCorsOrigin, credentials: true }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/uploads', express.static(env.UPLOAD_DIR));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 }));
  app.use('/api/auth', authRouter);
  app.use('/api/users', userRouter);
  app.use('/api/profiles', profileRouter);
  app.use('/api/connections', connectionRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/messages', messageRouter);
  app.use('/api/posts', postRouter);
  app.use('/api/admin', adminRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
