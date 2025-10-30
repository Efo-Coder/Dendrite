import { Request, Response } from 'express';

interface AuthRequest extends Request {
  userId?: string;
}

// Einfacher Image-Upload für Editor-Bilder (keine Attachment-DB-Einträge)
export const uploadImage = async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    // Nur die URL zurückgeben, kein DB-Eintrag
    const imageUrl = `/uploads/${file.filename}`;

    res.status(201).json({
      url: imageUrl,
      filename: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size
    });
  } catch (error) {
    console.error('Fehler beim Hochladen der Datei:', error);

    // Datei löschen bei Fehler
    if (req.file) {
      try {
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Fehler beim Löschen der Datei:', unlinkError);
      }
    }

    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};
