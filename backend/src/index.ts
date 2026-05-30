import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';
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
import shareRoutes from './routes/share.routes';
import checkoutRoutes from './routes/checkout.routes';
import { handleWebhook } from './controllers/checkout.controller';

import { setupYjsConnection } from './wsHandler';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

export const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173'];

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
}, express.static(path.join(__dirname, '../uploads')));

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
app.use('/api', shareRoutes);

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
    const note = await prisma.note.findFirst({ where: { id: noteId, userId: decoded.userId } });
    if (note) authorized = true;
  } catch {
    // Not a valid JWT – try share token
    const share = await prisma.noteShare.findUnique({ where: { token } });
    if (share && share.noteId === noteId) {
      if (!share.expiresAt || share.expiresAt > new Date()) authorized = true;
    }
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

// ─── Startup ─────────────────────────────────────────────────────────────────

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Dendrite Backend läuft auf http://localhost:${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/health`);
});
