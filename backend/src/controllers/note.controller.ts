import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';
import { extractUploadUrls, deleteFiles } from '../utils/imageCleanup';

export const getAllNotes = async (req: AuthRequest, res: Response) => {
  try {
    const { folderId, tagId, pinned, favorite, archived, deleted } = req.query;

    const where: any = { userId: req.userId };

    if (folderId) where.folderId = folderId as string;
    if (tagId) where.tags = { some: { id: tagId as string } };
    if (pinned !== undefined) where.isPinned = pinned === 'true';
    if (favorite !== undefined) where.isFavorite = favorite === 'true';
    if (archived !== undefined) where.isArchived = archived === 'true';
    if (deleted !== undefined) where.isDeleted = deleted === 'true';

    const notes = await prisma.note.findMany({
      where,
      include: { folder: true, tags: true, attachments: true },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    });

    let contextType = 'all';
    let contextId: string = '_none';

    if (folderId) {
      contextType = 'folder';
      contextId = folderId as string;
    } else if (tagId) {
      contextType = 'tag';
      contextId = tagId as string;
    } else if (favorite === 'true') {
      contextType = 'favorites';
    } else if (archived === 'true') {
      contextType = 'archive';
    }

    if (deleted !== 'true' && notes.length > 0) {
      const noteOrders = await prisma.noteOrder.findMany({
        where: {
          userId: req.userId,
          contextType,
          contextId,
          noteId: { in: notes.map(n => n.id) },
        },
      });

      const orderMap = new Map(noteOrders.map(no => [no.noteId, no.order]));

      const notesWithOrder = notes.filter(n => orderMap.has(n.id));
      const notesWithoutOrder = notes.filter(n => !orderMap.has(n.id));

      notesWithOrder.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return orderMap.get(a.id)! - orderMap.get(b.id)!;
      });

      notesWithoutOrder.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      notes.length = 0;
      notes.push(...notesWithOrder, ...notesWithoutOrder);
    }

    return res.json({ notes });
  } catch (error) {
    console.error('GetAllNotes error:', error);
    return res.status(500).json({ error: 'Fehler beim Abrufen der Notizen' });
  }
};

export const getNoteById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const note = await prisma.note.findFirst({
      where: { id, userId: req.userId },
      include: { folder: true, tags: true, attachments: true },
    });

    if (!note) {
      return res.status(404).json({ error: 'Notiz nicht gefunden' });
    }

    return res.json({ note });
  } catch (error) {
    console.error('GetNoteById error:', error);
    return res.status(500).json({ error: 'Fehler beim Abrufen der Notiz' });
  }
};

export const createNote = async (req: AuthRequest, res: Response) => {
  try {
    const { content, folderId, tags } = req.body;

    if (content === undefined || content === null) {
      return res.status(400).json({ error: 'Inhalt ist erforderlich' });
    }

    const note = await prisma.note.create({
      data: {
        content,
        userId: req.userId!,
        folderId: folderId || null,
        tags: tags ? { connect: tags.map((tagId: string) => ({ id: tagId })) } : undefined,
      },
      include: { folder: true, tags: true, attachments: true },
    });

    return res.status(201).json({ note });
  } catch (error) {
    console.error('CreateNote error:', error);
    return res.status(500).json({ error: 'Fehler beim Erstellen der Notiz' });
  }
};

export const updateNote = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { title, content, folderId, tags } = req.body;

    const existingNote = await prisma.note.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existingNote) {
      return res.status(404).json({ error: 'Notiz nicht gefunden' });
    }

    if (content !== undefined && existingNote.content) {
      const oldUrls = extractUploadUrls(existingNote.content);
      const newUrls = extractUploadUrls(content);
      const removed = oldUrls.filter(url => !newUrls.includes(url));
      deleteFiles(removed);
    }

    const note = await prisma.note.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existingNote.title,
        content: content !== undefined ? content : existingNote.content,
        folderId: folderId !== undefined ? folderId : existingNote.folderId,
        tags: tags ? { set: tags.map((tagId: string) => ({ id: tagId })) } : undefined,
      },
      include: { folder: true, tags: true, attachments: true },
    });

    return res.json({ note });
  } catch (error) {
    console.error('UpdateNote error:', error);
    return res.status(500).json({ error: 'Fehler beim Aktualisieren der Notiz' });
  }
};

export const deleteNote = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const existingNote = await prisma.note.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existingNote) {
      return res.status(404).json({ error: 'Notiz nicht gefunden' });
    }

    if (existingNote.content) {
      deleteFiles(extractUploadUrls(existingNote.content));
    }

    await prisma.note.delete({ where: { id } });

    return res.json({ message: 'Notiz erfolgreich gelöscht' });
  } catch (error) {
    console.error('DeleteNote error:', error);
    return res.status(500).json({ error: 'Fehler beim Löschen der Notiz' });
  }
};

export const searchNotes = async (req: AuthRequest, res: Response) => {
  try {
    const q = req.query.q as string;

    if (!q) {
      return res.status(400).json({ error: 'Suchbegriff erforderlich' });
    }

    const notes = await prisma.note.findMany({
      where: {
        userId: req.userId,
        content: { contains: q, mode: 'insensitive' },
      },
      include: { folder: true, tags: true },
      orderBy: { updatedAt: 'desc' },
    });

    return res.json({ notes });
  } catch (error) {
    console.error('SearchNotes error:', error);
    return res.status(500).json({ error: 'Fehler bei der Suche' });
  }
};

export const togglePin = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const note = await prisma.note.findFirst({ where: { id, userId: req.userId } });

    if (!note) {
      return res.status(404).json({ error: 'Notiz nicht gefunden' });
    }

    const updatedNote = await prisma.note.update({
      where: { id },
      data: { isPinned: !note.isPinned },
      include: { folder: true, tags: true },
    });

    return res.json({ note: updatedNote });
  } catch (error) {
    console.error('TogglePin error:', error);
    return res.status(500).json({ error: 'Fehler beim Pinnen der Notiz' });
  }
};

export const toggleFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const note = await prisma.note.findFirst({ where: { id, userId: req.userId } });

    if (!note) {
      return res.status(404).json({ error: 'Notiz nicht gefunden' });
    }

    const updatedNote = await prisma.note.update({
      where: { id },
      data: { isFavorite: !note.isFavorite },
      include: { folder: true, tags: true },
    });

    return res.json({ note: updatedNote });
  } catch (error) {
    console.error('ToggleFavorite error:', error);
    return res.status(500).json({ error: 'Fehler beim Favorisieren der Notiz' });
  }
};

export const toggleArchive = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const note = await prisma.note.findFirst({ where: { id, userId: req.userId } });

    if (!note) {
      return res.status(404).json({ error: 'Notiz nicht gefunden' });
    }

    const updatedNote = await prisma.note.update({
      where: { id },
      data: { isArchived: !note.isArchived },
      include: { folder: true, tags: true },
    });

    return res.json({ note: updatedNote });
  } catch (error) {
    console.error('ToggleArchive error:', error);
    return res.status(500).json({ error: 'Fehler beim Archivieren der Notiz' });
  }
};

export const toggleDelete = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const note = await prisma.note.findFirst({ where: { id, userId: req.userId } });

    if (!note) {
      return res.status(404).json({ error: 'Notiz nicht gefunden' });
    }

    const updatedNote = await prisma.note.update({
      where: { id },
      data: { isDeleted: !note.isDeleted },
      include: { folder: true, tags: true },
    });

    return res.json({ note: updatedNote });
  } catch (error) {
    console.error('ToggleDelete error:', error);
    return res.status(500).json({ error: 'Fehler beim Löschen der Notiz' });
  }
};

export const reorderNotes = async (req: AuthRequest, res: Response) => {
  try {
    const { noteOrders, contextType, contextId } = req.body;

    if (!Array.isArray(noteOrders)) {
      return res.status(400).json({ error: 'noteOrders muss ein Array sein' });
    }

    if (!contextType) {
      return res.status(400).json({ error: 'contextType ist erforderlich' });
    }

    await prisma.$transaction(
      noteOrders.map((item: { id: string; order: number }) =>
        prisma.noteOrder.upsert({
          where: {
            noteId_userId_contextType_contextId: {
              noteId: item.id,
              userId: req.userId!,
              contextType,
              contextId: contextId || '_none',
            },
          },
          create: {
            noteId: item.id,
            userId: req.userId!,
            contextType,
            contextId: contextId || '_none',
            order: item.order,
          },
          update: { order: item.order },
        })
      )
    );

    return res.json({ message: 'Reihenfolge erfolgreich aktualisiert' });
  } catch (error) {
    console.error('ReorderNotes error:', error);
    return res.status(500).json({ error: 'Fehler beim Aktualisieren der Reihenfolge' });
  }
};
