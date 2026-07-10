import { Router } from 'express';
import { summarizeText, getSummarizeUsage } from '../controllers/ai.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.post('/summarize', summarizeText);
router.get('/usage', getSummarizeUsage);

export default router;
