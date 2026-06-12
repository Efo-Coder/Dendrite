import { Response } from 'express';
import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';
import { AuthRequest } from '../middleware/auth.middleware';

const uploadsDir = path.join(process.cwd(), 'uploads');

function safeDeleteUpload(url: string) {
  const filename = url.replace('/uploads/', '');
  const resolved = path.resolve(uploadsDir, filename);
  if (!resolved.startsWith(uploadsDir + path.sep) && resolved !== uploadsDir) return;
  if (fs.existsSync(resolved)) fs.unlinkSync(resolved);
}

export const uploadAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.body.noteId as string;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    if (!noteId) {
      // Datei löschen, wenn keine noteId vorhanden ist
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'noteId ist erforderlich' });
    }

    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: { userId: true },
    });

    if (!note) {
      fs.unlinkSync(file.path);
      return res.status(404).json({ error: 'Notiz nicht gefunden' });
    }

    if (note.userId !== req.userId) {
      fs.unlinkSync(file.path);
      return res.status(403).json({ error: 'Kein Zugriff' });
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

    return res.status(201).json(attachment);
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

export const deleteAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const attachment = await prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment nicht gefunden' });
    }

    const note = await prisma.note.findUnique({ where: { id: attachment.noteId }, select: { userId: true } });
    if (!note || note.userId !== req.userId) {
      return res.status(403).json({ error: 'Kein Zugriff' });
    }

    safeDeleteUpload(attachment.url);

    await prisma.attachment.delete({
      where: { id },
    });

    return res.status(200).json({ message: 'Attachment erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des Attachments:', error);
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

export const getAttachmentsByNoteId = async (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.noteId as string;

    const note = await prisma.note.findUnique({ where: { id: noteId }, select: { userId: true } });
    if (!note || note.userId !== req.userId) {
      return res.status(403).json({ error: 'Kein Zugriff' });
    }

    const attachments = await prisma.attachment.findMany({
      where: { noteId },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(attachments);
  } catch (error) {
    console.error('Fehler beim Abrufen der Attachments:', error);
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
};
