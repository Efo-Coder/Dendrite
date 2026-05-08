import { Router } from 'express';
import { register, login, getMe, updateProfile, changePassword, deleteAccount } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateToken, getMe);
router.put('/profile', authenticateToken, updateProfile);
router.put('/password', authenticateToken, changePassword);
router.delete('/account', authenticateToken, deleteAccount);

export default router;
