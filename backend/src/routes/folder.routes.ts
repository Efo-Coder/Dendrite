import { Router } from 'express';
import {
  getAllFolders,
  getFolderById,
  createFolder,
  updateFolder,
  deleteFolder,
  reorderFolders,
  togglePinFolder,
} from '../controllers/folder.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getAllFolders);
router.post('/reorder', reorderFolders);
router.get('/:id', getFolderById);
router.post('/', createFolder);
router.put('/:id', updateFolder);
router.patch('/:id/pin', togglePinFolder);
router.delete('/:id', deleteFolder);

export default router;
