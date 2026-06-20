import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { getProfile, followUser, unfollowUser } from '../controllers/profile.controller';

const router = Router();

router.get('/:id', authenticateToken, getProfile);
router.post('/:id/follow', authenticateToken, followUser);
router.delete('/:id/follow', authenticateToken, unfollowUser);

export default router;
