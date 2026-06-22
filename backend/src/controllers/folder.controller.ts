import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const FOLDER_INCLUDE = {
  children: { select: { id: true } },
  notes: { where: { isDeleted: false, isArchived: false }, select: { id: true } },
} satisfies Prisma.FolderInclude;

// Scoped by query: ?parentId=… returns a folder's subfolders, ?spaceId=… returns a
// space's top-level folders (parentId null). Without either, all of the user's folders.
export const getAllFolders = async (req: AuthRequest, res: Response) => {
  try {
    const { spaceId, parentId } = req.query;
    const where: Prisma.FolderWhereInput = { userId: req.userId };
    if (parentId) {
      where.parentId = parentId as string;
    } else if (spaceId) {
      where.spaceId = spaceId as string;
      where.parentId = null;
    }

    const folders = await prisma.folder.findMany({
      where,
      include: FOLDER_INCLUDE,
      orderBy: [{ isPinned: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
    });

    return res.json({ folders });
  } catch (error) {
    console.error('GetAllFolders error:', error);
    return res.status(500).json({ error: 'Fehler beim Abrufen der Ordner' });
  }
};

export const getFolderById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const folder = await prisma.folder.findFirst({
      where: { id, userId: req.userId },
      include: { children: true, notes: true, parent: true },
    });

    if (!folder) {
      return res.status(404).json({ error: 'Ordner nicht gefunden' });
    }

    return res.json({ folder });
  } catch (error) {
    console.error('GetFolderById error:', error);
    return res.status(500).json({ error: 'Fehler beim Abrufen des Ordners' });
  }
};

export const createFolder = async (req: AuthRequest, res: Response) => {
  try {
    const { name, color, icon, coverImage, spaceId, parentId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name ist erforderlich' });
    }
    if (!spaceId) {
      return res.status(400).json({ error: 'spaceId ist erforderlich' });
    }

    // Both the target space and (optional) parent folder must belong to the user.
    const space = await prisma.space.findFirst({ where: { id: spaceId, userId: req.userId } });
    if (!space) {
      return res.status(404).json({ error: 'Space nicht gefunden' });
    }
    if (parentId) {
      const parent = await prisma.folder.findFirst({ where: { id: parentId, userId: req.userId, spaceId } });
      if (!parent) {
        return res.status(404).json({ error: 'Übergeordneter Ordner nicht gefunden' });
      }
    }

    // New folders lead their level (just behind pinned): one below the current minimum.
    const min = await prisma.folder.aggregate({
      where: { userId: req.userId, spaceId, parentId: parentId || null },
      _min: { order: true },
    });

    const folder = await prisma.folder.create({
      data: {
        name,
        color: color || '#10b981',
        icon: icon || null,
        coverImage: coverImage || null,
        order: (min._min.order ?? 0) - 1,
        spaceId,
        parentId: parentId || null,
        userId: req.userId!,
      },
      include: FOLDER_INCLUDE,
    });

    return res.status(201).json({ folder });
  } catch (error) {
    console.error('CreateFolder error:', error);
    return res.status(500).json({ error: 'Fehler beim Erstellen des Ordners' });
  }
};

export const updateFolder = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, color, icon, coverImage, parentId } = req.body;

    const existingFolder = await prisma.folder.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existingFolder) {
      return res.status(404).json({ error: 'Ordner nicht gefunden' });
    }

    const folder = await prisma.folder.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existingFolder.name,
        color: color !== undefined ? color : existingFolder.color,
        icon: icon !== undefined ? icon : existingFolder.icon,
        coverImage: coverImage !== undefined ? coverImage : existingFolder.coverImage,
        parentId: parentId !== undefined ? parentId : existingFolder.parentId,
      },
      include: { children: true, parent: true },
    });

    return res.json({ folder });
  } catch (error) {
    console.error('UpdateFolder error:', error);
    return res.status(500).json({ error: 'Fehler beim Aktualisieren des Ordners' });
  }
};

export const deleteFolder = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const existingFolder = await prisma.folder.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existingFolder) {
      return res.status(404).json({ error: 'Ordner nicht gefunden' });
    }

    await prisma.folder.delete({ where: { id } });

    return res.json({ message: 'Ordner erfolgreich gelöscht' });
  } catch (error) {
    console.error('DeleteFolder error:', error);
    return res.status(500).json({ error: 'Fehler beim Löschen des Ordners' });
  }
};

export const reorderFolders = async (req: AuthRequest, res: Response) => {
  try {
    const { folderOrders } = req.body;

    if (!Array.isArray(folderOrders)) {
      return res.status(400).json({ error: 'folderOrders muss ein Array sein' });
    }

    // updateMany scoped to the owner — silently ignores ids the user doesn't own.
    await prisma.$transaction(
      folderOrders.map((item: { id: string; order: number }) =>
        prisma.folder.updateMany({
          where: { id: item.id, userId: req.userId! },
          data: { order: item.order },
        }),
      ),
    );

    return res.json({ message: 'Ordner-Reihenfolge aktualisiert' });
  } catch (error) {
    console.error('ReorderFolders error:', error);
    return res.status(500).json({ error: 'Fehler beim Sortieren der Ordner' });
  }
};

export const togglePinFolder = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.folder.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Ordner nicht gefunden' });
    }

    const folder = await prisma.folder.update({
      where: { id },
      data: { isPinned: !existing.isPinned },
      include: { children: true, parent: true },
    });

    return res.json({ folder });
  } catch (error) {
    console.error('TogglePinFolder error:', error);
    return res.status(500).json({ error: 'Fehler beim Anpinnen des Ordners' });
  }
};
