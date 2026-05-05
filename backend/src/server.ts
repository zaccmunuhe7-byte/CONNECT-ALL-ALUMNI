import http from 'node:http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { query } from './db/pool.js';
import type { AuthUser } from './middleware/auth.js';

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: env.CLIENT_ORIGINS, credentials: true }
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    socket.data.user = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUser;
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', async (socket) => {
  const memberships = await query<{ conversation_id: string }>(
    'SELECT conversation_id FROM conversation_members WHERE user_id = $1',
    [socket.data.user.id]
  );
  memberships.rows.forEach((row) => socket.join(row.conversation_id));
});

app.set('io', io);

server.listen(env.PORT, () => {
  console.log(`CONNECT_ALUMNI API listening on port ${env.PORT}`);
});
