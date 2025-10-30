import { Request, Response } from 'express';
import { prisma } from '../index';
import fs from 'fs';
import path from 'path';

interface AuthRequest extends Request {
  userId?: string;
}

export const uploadAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const { noteId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    if (!noteId) {
      // Datei löschen, wenn keine noteId vorhanden ist
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'noteId ist erforderlich' });
    }

    // Prüfen, ob die Notiz existiert
    const note = await prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      // Datei löschen, wenn Notiz nicht existiert
      fs.unlinkSync(file.path);
      return res.status(404).json({ error: 'Notiz nicht gefunden' });
    }

    // Attachment in Datenbank erstellen
    const attachment = await prisma.attachment.create({
      data: {
        filename: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        url: `/uploads/${file.filename}`,
        noteId: noteId,
      },
    });

    res.status(201).json(attachment);
  } catch (error) {
    console.error('Fehler beim Hochladen der Datei:', error);

    // Datei löschen bei Fehler
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Fehler beim Löschen der Datei:', unlinkError);
      }
    }

    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

export const deleteAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Attachment abrufen
    const attachment = await prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment nicht gefunden' });
    }

    // Datei vom Dateisystem löschen
    const uploadsDir = path.join(__dirname, '../../uploads');
    const filename = attachment.url.replace('/uploads/', '');
    const filePath = path.join(uploadsDir, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Attachment aus Datenbank löschen
    await prisma.attachment.delete({
      where: { id },
    });

    res.status(200).json({ message: 'Attachment erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des Attachments:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

export const getAttachmentsByNoteId = async (req: AuthRequest, res: Response) => {
  try {
    const { noteId } = req.params;

    const attachments = await prisma.attachment.findMany({
      where: { noteId },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(attachments);
  } catch (error) {
    console.error('Fehler beim Abrufen der Attachments:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};
