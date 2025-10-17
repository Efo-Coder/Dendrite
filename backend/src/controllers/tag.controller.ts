import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';

export const getAllTags = async (req: AuthRequest, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({
      where: { userId: req.userId },
      include: {
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
      orderBy: { name: 'asc' },
    });

    res.json({ tags });
  } catch (error) {
    console.error('GetAllTags error:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Tags' });
  }
};

export const getTagById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const tag = await prisma.tag.findFirst({
      where: {
        id,
        userId: req.userId,
      },
      include: {
        notes: true,
      },
    });

    if (!tag) {
      return res.status(404).json({ error: 'Tag nicht gefunden' });
    }

    res.json({ tag });
  } catch (error) {
    console.error('GetTagById error:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen des Tags' });
  }
};

export const createTag = async (req: AuthRequest, res: Response) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name ist erforderlich' });
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        color: color || '#10b981',
        userId: req.userId!,
      },
    });

    res.status(201).json({ tag });
  } catch (error) {
    console.error('CreateTag error:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Tags' });
  }
};

export const updateTag = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    const existingTag = await prisma.tag.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existingTag) {
      return res.status(404).json({ error: 'Tag nicht gefunden' });
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existingTag.name,
        color: color !== undefined ? color : existingTag.color,
      },
    });

    res.json({ tag });
  } catch (error) {
    console.error('UpdateTag error:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Tags' });
  }
};

export const deleteTag = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingTag = await prisma.tag.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existingTag) {
      return res.status(404).json({ error: 'Tag nicht gefunden' });
    }

    await prisma.tag.delete({ where: { id } });

    res.json({ message: 'Tag erfolgreich gelöscht' });
  } catch (error) {
    console.error('DeleteTag error:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Tags' });
  }
};
