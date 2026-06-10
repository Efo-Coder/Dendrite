import { Router } from 'express';
import { submitRating, submitBugReport } from '../controllers/feedback.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.post('/rating', submitRating);
router.post('/bug-report', submitBugReport);

export default router;
