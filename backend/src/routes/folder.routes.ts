import { Router } from 'express';
import {
  getAllFolders,
  getFolderById,
  createFolder,
  updateFolder,
  deleteFolder,
  reorderFolders,
} from '../controllers/folder.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getAllFolders);
router.post('/reorder', reorderFolders);
router.get('/:id', getFolderById);
router.post('/', createFolder);
router.put('/:id', updateFolder);
router.delete('/:id', deleteFolder);

export default router;
