import { Router } from 'express';
import {
  getAllNotes,
  getNoteById,
  getNoteCounts,
  createNote,
  updateNote,
  deleteNote,
  searchNotes,
  togglePin,
  toggleFavorite,
  toggleArchive,
  toggleDelete,
  reorderNotes,
} from '../controllers/note.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Alle Routes benötigen Authentifizierung
router.use(authenticateToken);

router.get('/', getAllNotes);
router.get('/counts', getNoteCounts);
router.get('/search', searchNotes);
router.get('/:id', getNoteById);
router.post('/', createNote);
router.post('/reorder', reorderNotes);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);
router.patch('/:id/pin', togglePin);
router.patch('/:id/favorite', toggleFavorite);
router.patch('/:id/archive', toggleArchive);
router.patch('/:id/trash', toggleDelete);

export default router;
