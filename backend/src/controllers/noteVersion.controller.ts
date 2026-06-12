import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { NOTE_INCLUDE, transformNote } from './note.helpers';
import { capVersions } from '../services/noteVersion.service';

export const getNoteVersions = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const note = await prisma.note.findFirst({ where: { id, userId: req.userId } });
    if (!note) return res.status(404).json({ error: 'Notiz nicht gefunden' });

    const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { plan: true } });
    const plan = (user?.plan ?? 'free').toLowerCase();

    const versions = await prisma.noteVersion.findMany({
      where: { noteId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, createdAt: true },
    });

    return res.json({ versions, plan });
  } catch (error) {
    console.error('GetNoteVersions error:', error);
    return res.status(500).json({ error: 'Fehler beim Abrufen der Versionen' });
  }
};

export const restoreNoteVersion = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const versionId = req.params.versionId as string;

    const note = await prisma.note.findFirst({ where: { id, userId: req.userId } });
    if (!note) return res.status(404).json({ error: 'Notiz nicht gefunden' });

    const version = await prisma.noteVersion.findFirst({ where: { id: versionId, noteId: id } });
    if (!version) return res.status(404).json({ error: 'Version nicht gefunden' });

    // Always snapshot the current state (no throttle) so a restore can be undone
    await prisma.noteVersion.create({ data: { noteId: id, content: note.content, title: note.title } });
    await capVersions(id);

    const raw = await prisma.note.update({
      where: { id },
      data: { content: version.content, title: version.title ?? note.title },
      include: NOTE_INCLUDE,
    });

    return res.json({ note: transformNote(raw) });
  } catch (error) {
    console.error('RestoreNoteVersion error:', error);
    return res.status(500).json({ error: 'Fehler beim Wiederherstellen der Version' });
  }
};
