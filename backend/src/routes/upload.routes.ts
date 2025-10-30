import { Router } from 'express';
import { uploadImage } from '../controllers/upload.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { upload } from '../config/multer.config';

const router = Router();

// Alle Routes benötigen Authentifizierung
router.use(authenticateToken);

// Einfacher Image-Upload (kein Attachment-DB-Eintrag)
router.post('/image', upload.single('file'), uploadImage);

export default router;
