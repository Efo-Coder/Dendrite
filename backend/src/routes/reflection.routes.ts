import { Router } from 'express';
import {
  getReflections,
  getTodayReflection,
  upsertTodayReflection,
} from '../controllers/reflection.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getReflections);
router.get('/today', getTodayReflection);
router.put('/today', upsertTodayReflection);

export default router;
