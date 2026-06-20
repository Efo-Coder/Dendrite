import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { addClient, removeClient } from '../services/notificationHub';

const MAX_NOTIFICATIONS = 50;
const SSE_HEARTBEAT_MS = 25_000;

// Recent notifications for the bell + the unread badge count.
export const listNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.userId! },
        orderBy: { createdAt: 'desc' },
        take: MAX_NOTIFICATIONS,
      }),
      prisma.notification.count({ where: { userId: req.userId!, read: false } }),
    ]);
    return res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('ListNotifications error:', error);
    return res.status(500).json({ error: 'Failed to load notifications' });
  }
};

// Clear the badge once the panel is opened.
export const markAllRead = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId!, read: false },
      data: { read: true },
    });
    return res.json({ ok: true });
  } catch (error) {
    console.error('MarkAllRead error:', error);
    return res.status(500).json({ error: 'Failed to update notifications' });
  }
};

// Remove a single notification (e.g. after accepting/declining an invite).
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.notification.deleteMany({ where: { id, userId: req.userId! } });
    return res.json({ ok: true });
  } catch (error) {
    console.error('DeleteNotification error:', error);
    return res.status(500).json({ error: 'Failed to delete notification' });
  }
};

// SSE stream: pushes each new notification to the recipient live. Token comes via
// ?token= (EventSource can't set headers); comment pings keep the socket open.
export const streamNotifications = (req: AuthRequest, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const userId = req.userId!;
  addClient(userId, res);
  res.write(': connected\n\n');

  const heartbeat = setInterval(() => res.write(': ping\n\n'), SSE_HEARTBEAT_MS);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(userId, res);
  });
};
