import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  listNotifications,
  markAllRead,
  deleteNotification,
  streamNotifications,
} from '../controllers/notification.controller';

const router = Router();

router.get('/stream', authenticateToken, streamNotifications);
router.get('/', authenticateToken, listNotifications);
router.patch('/read', authenticateToken, markAllRead);
router.delete('/:id', authenticateToken, deleteNotification);

export default router;
