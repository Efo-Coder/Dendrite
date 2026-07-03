import { Router } from 'express';
import {
  getAllNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  emptyTrash,
  searchNotes,
  togglePin,
  toggleFavorite,
  toggleArchive,
  toggleDelete,
  reorderNotes,
} from '../controllers/note.controller';
import { getNoteVersions, restoreNoteVersion } from '../controllers/noteVersion.controller';
import { exportNoteToPdf } from '../controllers/noteExport.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getAllNotes);
router.get('/search', searchNotes);
router.get('/:id', getNoteById);
router.post('/', createNote);
router.post('/reorder', reorderNotes);
router.put('/:id', updateNote);
// Static path must precede '/:id', or "trash" is captured as a note id.
router.delete('/trash', emptyTrash);
router.delete('/:id', deleteNote);
router.patch('/:id/pin', togglePin);
router.patch('/:id/favorite', toggleFavorite);
router.patch('/:id/archive', toggleArchive);
router.patch('/:id/trash', toggleDelete);
router.get('/:id/versions', getNoteVersions);
router.post('/:id/versions/:versionId/restore', restoreNoteVersion);
router.get('/:id/export/pdf', exportNoteToPdf);

export default router;
