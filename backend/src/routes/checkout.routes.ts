import { Router } from 'express';
import { createCheckoutSession, createPortalSession } from '../controllers/checkout.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/create-session', authenticateToken, createCheckoutSession);
router.post('/portal-session', authenticateToken, createPortalSession);

export default router;
