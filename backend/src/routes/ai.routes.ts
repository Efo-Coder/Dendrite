import { Router } from 'express';
import { summarizeText } from '../controllers/ai.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.post('/summarize', summarizeText);

export default router;
