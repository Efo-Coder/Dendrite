import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const ACTIVE_NOTES = { where: { isDeleted: false, isArchived: false }, select: { id: true } } as const;

export const getAllSpaces = async (req: AuthRequest, res: Response) => {
  try {
    const spaces = await prisma.space.findMany({
      where: { userId: req.userId },
      include: { folders: { select: { id: true } }, notes: ACTIVE_NOTES },
      orderBy: [{ isPinned: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
    });
    return res.json({ spaces });
  } catch (error) {
    console.error('GetAllSpaces error:', error);
    return res.status(500).json({ error: 'Fehler beim Abrufen der Spaces' });
  }
};

export const getSpaceById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const space = await prisma.space.findFirst({
      where: { id, userId: req.userId },
      include: { folders: { select: { id: true } }, notes: ACTIVE_NOTES },
    });
    if (!space) {
      return res.status(404).json({ error: 'Space nicht gefunden' });
    }
    return res.json({ space });
  } catch (error) {
    console.error('GetSpaceById error:', error);
    return res.status(500).json({ error: 'Fehler beim Abrufen des Space' });
  }
};

export const createSpace = async (req: AuthRequest, res: Response) => {
  try {
    const { name, color, icon, coverImage } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name ist erforderlich' });
    }

    // New spaces lead the list (just behind pinned): one below the current minimum.
    const min = await prisma.space.aggregate({
      where: { userId: req.userId },
      _min: { order: true },
    });

    const space = await prisma.space.create({
      data: {
        name,
        color: color || '#10b981',
        icon: icon || null,
        coverImage: coverImage || null,
        order: (min._min.order ?? 0) - 1,
        userId: req.userId!,
      },
      include: { folders: { select: { id: true } }, notes: ACTIVE_NOTES },
    });

    return res.status(201).json({ space });
  } catch (error) {
    console.error('CreateSpace error:', error);
    return res.status(500).json({ error: 'Fehler beim Erstellen des Space' });
  }
};

export const updateSpace = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, color, icon, coverImage } = req.body;

    const existing = await prisma.space.findFirst({ where: { id, userId: req.userId } });
    if (!existing) {
      return res.status(404).json({ error: 'Space nicht gefunden' });
    }

    const space = await prisma.space.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        color: color !== undefined ? color : existing.color,
        icon: icon !== undefined ? icon : existing.icon,
        coverImage: coverImage !== undefined ? coverImage : existing.coverImage,
      },
      include: { folders: { select: { id: true } }, notes: ACTIVE_NOTES },
    });

    return res.json({ space });
  } catch (error) {
    console.error('UpdateSpace error:', error);
    return res.status(500).json({ error: 'Fehler beim Aktualisieren des Space' });
  }
};

export const deleteSpace = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.space.findFirst({ where: { id, userId: req.userId } });
    if (!existing) {
      return res.status(404).json({ error: 'Space nicht gefunden' });
    }

    // Cascade removes the space's folders; the notes' spaceId/folderId fall back to
    // null (SetNull), so notes survive as top-level notes.
    await prisma.space.delete({ where: { id } });

    return res.json({ message: 'Space erfolgreich gelöscht' });
  } catch (error) {
    console.error('DeleteSpace error:', error);
    return res.status(500).json({ error: 'Fehler beim Löschen des Space' });
  }
};

export const reorderSpaces = async (req: AuthRequest, res: Response) => {
  try {
    const { spaceOrders } = req.body;

    if (!Array.isArray(spaceOrders)) {
      return res.status(400).json({ error: 'spaceOrders muss ein Array sein' });
    }

    await prisma.$transaction(
      spaceOrders.map((item: { id: string; order: number }) =>
        prisma.space.updateMany({
          where: { id: item.id, userId: req.userId! },
          data: { order: item.order },
        }),
      ),
    );

    return res.json({ message: 'Space-Reihenfolge aktualisiert' });
  } catch (error) {
    console.error('ReorderSpaces error:', error);
    return res.status(500).json({ error: 'Fehler beim Sortieren der Spaces' });
  }
};

export const togglePinSpace = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.space.findFirst({ where: { id, userId: req.userId } });
    if (!existing) {
      return res.status(404).json({ error: 'Space nicht gefunden' });
    }

    const space = await prisma.space.update({
      where: { id },
      data: { isPinned: !existing.isPinned },
      include: { folders: { select: { id: true } }, notes: ACTIVE_NOTES },
    });

    return res.json({ space });
  } catch (error) {
    console.error('TogglePinSpace error:', error);
    return res.status(500).json({ error: 'Fehler beim Anpinnen des Space' });
  }
};
