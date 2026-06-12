import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import jwt from 'jsonwebtoken';
import { WebSocketServer, WebSocket } from 'ws';
import { Duplex } from 'stream';

// Routes
import authRoutes from './routes/auth.routes';
import noteRoutes from './routes/note.routes';
import folderRoutes from './routes/folder.routes';
import tagRoutes from './routes/tag.routes';
import attachmentRoutes from './routes/attachment.routes';
import uploadRoutes from './routes/upload.routes';
import collaboratorRoutes from './routes/collaborator.routes';
import checkoutRoutes from './routes/checkout.routes';
import feedbackRoutes from './routes/feedback.routes';
import { handleWebhook } from './controllers/checkout.controller';

import { setupYjsConnection } from './wsHandler';
import { prisma } from './lib/prisma';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:4173'];

app.set('trust proxy', 1);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(helmet());

// Stripe webhook needs raw body — must be registered before express.json()
app.post('/api/checkout/webhook', express.raw({ type: 'application/json' }), handleWebhook);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', (_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(process.cwd(), 'uploads')));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/checkout', checkoutRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api', collaboratorRoutes);
app.use('/api/feedback', feedbackRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// ─── WebSocket Server ────────────────────────────────────────────────────────

const httpServer = createServer(app);
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws: WebSocket, _req: Request, docName: string) => {
  setupYjsConnection(ws, docName);
});

httpServer.on('upgrade', async (request, socket: Duplex, head: Buffer) => {
  const url = new URL(request.url ?? '/', `http://localhost`);

  if (!url.pathname.startsWith('/collaboration/')) {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }

  const token = url.searchParams.get('token');
  const noteId = decodeURIComponent(url.pathname.replace('/collaboration/', ''));

  if (!token || !noteId) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  let authorized = false;
  const JWT_SECRET = process.env.JWT_SECRET!;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    // Owner check
    const note = await prisma.note.findFirst({ where: { id: noteId, userId: decoded.userId } });
    if (note) {
      authorized = true;
    } else {
      // Accepted collaborator check
      const collab = await prisma.noteCollaborator.findFirst({
        where: { noteId, userId: decoded.userId, status: 'accepted' },
      });
      if (collab) authorized = true;
    }
  } catch {
    // Invalid JWT → no access
  }

  if (!authorized) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, ws => {
    wss.emit('connection', ws, request, noteId);
  });
});

// ─── Cleanup: unverified accounts ────────────────────────────────────────────

async function deleteExpiredUnverifiedAccounts() {
  try {
    const result = await prisma.user.deleteMany({
      where: {
        isVerified: false,
        verificationTokenExpiresAt: { lt: new Date() },
      },
    });
    if (result.count > 0) console.log(`Cleanup: ${result.count} unverified account(s) deleted`);
  } catch (err) {
    console.error('Cleanup error:', err);
  }
}

setInterval(deleteExpiredUnverifiedAccounts, 60 * 60 * 1000); // hourly

// ─── Startup ─────────────────────────────────────────────────────────────────

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Dendrite backend running at http://localhost:${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/health`);
});
