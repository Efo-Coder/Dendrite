import { Router } from 'express';
import { createCheckoutSession } from '../controllers/checkout.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/create-session', authenticateToken, createCheckoutSession);

export default router;
