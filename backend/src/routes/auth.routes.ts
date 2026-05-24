import { Router } from 'express';
import { register, login, verifyEmail, resendVerification, getMe, updateProfile, changePassword, deleteAccount, uploadAvatar, deleteAvatar } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { upload } from '../config/multer.config';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.get('/me', authenticateToken, getMe);
router.put('/profile', authenticateToken, updateProfile);
router.put('/password', authenticateToken, changePassword);
router.delete('/account', authenticateToken, deleteAccount);
router.post('/avatar', authenticateToken, upload.single('avatar'), uploadAvatar);
router.delete('/avatar', authenticateToken, deleteAvatar);

export default router;
