import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getAllBookmarks = async (req: AuthRequest, res: Response) => {
  try {
    const rawBookmarks = await prisma.bookmark.findMany({
      where: { userId: req.userId },
      include: {
        noteBookmarks: {
          where: { note: { isDeleted: false, isArchived: false } },
          select: { noteId: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const bookmarks = rawBookmarks.map(({ noteBookmarks, ...bookmark }) => ({
      ...bookmark,
      notes: noteBookmarks.map(nb => ({ id: nb.noteId })),
    }));

    return res.json({ bookmarks });
  } catch (error) {
    console.error('GetAllBookmarks error:', error);
    return res.status(500).json({ error: 'Fehler beim Abrufen der Bookmarks' });
  }
};

export const getBookmarkById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const bookmark = await prisma.bookmark.findFirst({
      where: { id, userId: req.userId },
    });

    if (!bookmark) {
      return res.status(404).json({ error: 'Bookmark nicht gefunden' });
    }

    return res.json({ bookmark });
  } catch (error) {
    console.error('GetBookmarkById error:', error);
    return res.status(500).json({ error: 'Fehler beim Abrufen des Bookmarks' });
  }
};

export const createBookmark = async (req: AuthRequest, res: Response) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name ist erforderlich' });
    }

    const bookmark = await prisma.bookmark.create({
      data: {
        name,
        color: color || '#10b981',
        userId: req.userId!,
      },
    });

    return res.status(201).json({ bookmark });
  } catch (error) {
    console.error('CreateBookmark error:', error);
    return res.status(500).json({ error: 'Fehler beim Erstellen des Bookmarks' });
  }
};

export const updateBookmark = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, color } = req.body;

    const existingBookmark = await prisma.bookmark.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existingBookmark) {
      return res.status(404).json({ error: 'Bookmark nicht gefunden' });
    }

    const bookmark = await prisma.bookmark.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existingBookmark.name,
        color: color !== undefined ? color : existingBookmark.color,
      },
    });

    return res.json({ bookmark });
  } catch (error) {
    console.error('UpdateBookmark error:', error);
    return res.status(500).json({ error: 'Fehler beim Aktualisieren des Bookmarks' });
  }
};

export const deleteBookmark = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const existingBookmark = await prisma.bookmark.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existingBookmark) {
      return res.status(404).json({ error: 'Bookmark nicht gefunden' });
    }

    await prisma.bookmark.delete({ where: { id } });

    return res.json({ message: 'Bookmark erfolgreich gelöscht' });
  } catch (error) {
    console.error('DeleteBookmark error:', error);
    return res.status(500).json({ error: 'Fehler beim Löschen des Bookmarks' });
  }
};
