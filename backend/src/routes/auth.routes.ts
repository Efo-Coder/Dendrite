import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, verifyEmail, resendVerification, forgotPassword, resetPassword, setup2FA, enable2FA, disable2FA, verify2FA, getMe, updateProfile, changePassword, deleteAccount, uploadAvatar, deleteAvatar } from '../controllers/auth.controller';
import { redirectToGoogle, handleGoogleCallback, redirectToGithub, handleGithubCallback, redirectToMicrosoft, handleMicrosoftCallback } from '../controllers/oauth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { upload } from '../config/multer.config';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many failed attempts. Please try again in 15 minutes.' },
});

router.post('/register', loginLimiter, register);
router.post('/login', loginLimiter, login);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', loginLimiter, forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/2fa/setup', authenticateToken, setup2FA);
router.post('/2fa/enable', authenticateToken, enable2FA);
router.post('/2fa/disable', authenticateToken, disable2FA);
router.post('/2fa/verify', verify2FA);
// OAuth
router.get('/google', redirectToGoogle);
router.get('/google/callback', handleGoogleCallback);
router.get('/github', redirectToGithub);
router.get('/github/callback', handleGithubCallback);
router.get('/microsoft', redirectToMicrosoft);
router.get('/microsoft/callback', handleMicrosoftCallback);

router.get('/me', authenticateToken, getMe);
router.put('/profile', authenticateToken, updateProfile);
router.put('/password', authenticateToken, changePassword);
router.delete('/account', authenticateToken, deleteAccount);
router.post('/avatar', authenticateToken, upload.single('avatar'), uploadAvatar);
router.delete('/avatar', authenticateToken, deleteAvatar);

export default router;
