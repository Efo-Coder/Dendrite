import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { searchUsers, getProfile, followUser, unfollowUser } from '../controllers/profile.controller';

const router = Router();

// Must precede '/:id', otherwise "search" is captured as a profile id.
router.get('/search', authenticateToken, searchUsers);
router.get('/:id', authenticateToken, getProfile);
router.post('/:id/follow', authenticateToken, followUser);
router.delete('/:id/follow', authenticateToken, unfollowUser);

export default router;
