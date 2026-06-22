import { Router } from 'express';
import {
  getAllSpaces,
  getSpaceById,
  createSpace,
  updateSpace,
  deleteSpace,
  reorderSpaces,
  togglePinSpace,
} from '../controllers/space.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getAllSpaces);
router.post('/reorder', reorderSpaces);
router.get('/:id', getSpaceById);
router.post('/', createSpace);
router.put('/:id', updateSpace);
router.patch('/:id/pin', togglePinSpace);
router.delete('/:id', deleteSpace);

export default router;
