import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  getShare,
  createShare,
  deleteShare,
  getSharedNote,
  updateSharedNote,
} from '../controllers/share.controller';

const router = Router();

// Owner endpoints (require auth)
router.get('/notes/:id/share', authenticateToken, getShare);
router.post('/notes/:id/share', authenticateToken, createShare);
router.delete('/notes/:id/share', authenticateToken, deleteShare);

// Public endpoints (no auth — verified by share token)
router.get('/shared/:token', getSharedNote);
router.put('/shared/:token', updateSharedNote);

export default router;
