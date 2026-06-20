import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  publishNote,
  unpublishNote,
  getMyPublication,
  listPublished,
  getPublishedById,
} from '../controllers/published.controller';

const router = Router();

// Owner operations on their own note
router.post('/notes/:id', authenticateToken, publishNote);
router.delete('/notes/:id', authenticateToken, unpublishNote);
router.get('/notes/:id/status', authenticateToken, getMyPublication);

// Discovery (read-only). `/` and `/:id` stay after the `/notes/...` paths.
router.get('/', authenticateToken, listPublished);
router.get('/:id', authenticateToken, getPublishedById);

export default router;
