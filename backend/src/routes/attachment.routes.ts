import { Router } from 'express';
import {
  uploadAttachment,
  deleteAttachment,
  getAttachmentsByNoteId,
} from '../controllers/attachment.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { upload } from '../config/multer.config';

const router = Router();

// Alle Routes benötigen Authentifizierung
router.use(authenticateToken);

// Attachment hochladen
router.post('/upload', upload.single('file'), uploadAttachment);

// Attachments für eine Notiz abrufen
router.get('/note/:noteId', getAttachmentsByNoteId);

// Attachment löschen
router.delete('/:id', deleteAttachment);

export default router;
