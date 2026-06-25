import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const RECURRENCES = ['none', 'daily', 'weekly', 'monthly'] as const;
type Recurrence = (typeof RECURRENCES)[number];

// Reminders for one note (the editor's reminder panel), soonest first.
export const listReminders = async (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.query.noteId as string | undefined;
    if (!noteId) return res.status(400).json({ error: 'noteId is required' });

    const reminders = await prisma.reminder.findMany({
      where: { userId: req.userId!, noteId },
      orderBy: { remindAt: 'asc' },
    });
    return res.json({ reminders });
  } catch (error) {
    console.error('ListReminders error:', error);
    return res.status(500).json({ error: 'Failed to load reminders' });
  }
};

export const createReminder = async (req: AuthRequest, res: Response) => {
  try {
    const { noteId, description, remindAt, recurrence } = req.body as {
      noteId?: string;
      description?: string;
      remindAt?: string;
      recurrence?: string;
    };

    if (!noteId || !description?.trim() || !remindAt) {
      return res.status(400).json({ error: 'noteId, description and remindAt are required' });
    }

    const when = new Date(remindAt);
    if (Number.isNaN(when.getTime())) {
      return res.status(400).json({ error: 'Invalid remindAt' });
    }

    const rec: Recurrence = RECURRENCES.includes(recurrence as Recurrence)
      ? (recurrence as Recurrence)
      : 'none';

    // Owner check — only the note's owner can attach reminders to it.
    const note = await prisma.note.findFirst({
      where: { id: noteId, userId: req.userId! },
      select: { id: true },
    });
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const reminder = await prisma.reminder.create({
      data: {
        userId: req.userId!,
        noteId,
        description: description.trim(),
        remindAt: when,
        recurrence: rec,
      },
    });
    return res.status(201).json({ reminder });
  } catch (error) {
    console.error('CreateReminder error:', error);
    return res.status(500).json({ error: 'Failed to create reminder' });
  }
};

export const deleteReminder = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.reminder.deleteMany({ where: { id, userId: req.userId! } });
    return res.json({ ok: true });
  } catch (error) {
    console.error('DeleteReminder error:', error);
    return res.status(500).json({ error: 'Failed to delete reminder' });
  }
};
