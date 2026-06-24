import { Router } from 'express';
import {
  getAllBookmarks,
  getBookmarkById,
  createBookmark,
  updateBookmark,
  deleteBookmark,
} from '../controllers/bookmark.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getAllBookmarks);
router.get('/:id', getBookmarkById);
router.post('/', createBookmark);
router.put('/:id', updateBookmark);
router.delete('/:id', deleteBookmark);

export default router;
