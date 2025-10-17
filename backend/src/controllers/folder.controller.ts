import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';

export const getAllFolders = async (req: AuthRequest, res: Response) => {
  try {
    const folders = await prisma.folder.findMany({
      where: { userId: req.userId },
      include: {
        children: true,
        notes: {
          where: {
            isDeleted: false,
            isArchived: false,
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ folders });
  } catch (error) {
    console.error('GetAllFolders error:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Ordner' });
  }
};

export const getFolderById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const folder = await prisma.folder.findFirst({
      where: {
        id,
        userId: req.userId,
      },
      include: {
        children: true,
        notes: true,
        parent: true,
      },
    });

    if (!folder) {
      return res.status(404).json({ error: 'Ordner nicht gefunden' });
    }

    res.json({ folder });
  } catch (error) {
    console.error('GetFolderById error:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen des Ordners' });
  }
};

export const createFolder = async (req: AuthRequest, res: Response) => {
  try {
    const { name, color, icon, parentId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name ist erforderlich' });
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        color: color || '#10b981',
        icon: icon || null,
        parentId: parentId || null,
        userId: req.userId!,
      },
      include: {
        children: true,
        parent: true,
      },
    });

    res.status(201).json({ folder });
  } catch (error) {
    console.error('CreateFolder error:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Ordners' });
  }
};

export const updateFolder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color, icon, parentId } = req.body;

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
        parentId: parentId !== undefined ? parentId : existingFolder.parentId,
      },
      include: {
        children: true,
        parent: true,
      },
    });

    res.json({ folder });
  } catch (error) {
    console.error('UpdateFolder error:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Ordners' });
  }
};

export const deleteFolder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingFolder = await prisma.folder.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existingFolder) {
      return res.status(404).json({ error: 'Ordner nicht gefunden' });
    }

    await prisma.folder.delete({ where: { id } });

    res.json({ message: 'Ordner erfolgreich gelöscht' });
  } catch (error) {
    console.error('DeleteFolder error:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Ordners' });
  }
};
