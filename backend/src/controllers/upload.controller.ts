import { Response } from 'express';
import fs from 'fs';
import { AuthRequest } from '../middleware/auth.middleware';

// Einfacher Image-Upload für Editor-Bilder (keine Attachment-DB-Einträge)
export const uploadImage = async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    const imageUrl = `/uploads/${file.filename}`;

    return res.status(201).json({
      url: imageUrl,
      filename: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size
    });
  } catch (error) {
    console.error('Fehler beim Hochladen der Datei:', error);

    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Fehler beim Löschen der Datei:', unlinkError);
      }
    }

    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
};
