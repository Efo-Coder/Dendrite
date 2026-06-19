import { Router } from 'express';
import { getConstellations, getThemeNotes } from '../controllers/constellation.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getConstellations);
router.get('/:id/notes', getThemeNotes);

export default router;
