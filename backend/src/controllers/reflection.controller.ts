import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { REFLECTION_PROMPTS } from '../data/reflectionPrompts';

// ─── Daily prompts ─────────────────────────────────────────────────────────
// Deterministic prompt for a day, so the daily impulse is the same for everyone.
function promptForDate(date: Date): string {
  const dayIndex = Math.floor(date.getTime() / 86_400_000);
  return REFLECTION_PROMPTS[dayIndex % REFLECTION_PROMPTS.length];
}

// @db.Date stores date-only; UTC midnight keeps the unique [userId, date] stable
// regardless of server timezone. Day boundaries follow UTC for now.
function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// ─── Handlers ──────────────────────────────────────────────────────────────

export const getReflections = async (req: AuthRequest, res: Response) => {
  try {
    const reflections = await prisma.reflection.findMany({
      where: { userId: req.userId },
      orderBy: { date: 'desc' },
    });

    return res.json({ reflections });
  } catch (error) {
    console.error('GetReflections error:', error);
    return res.status(500).json({ error: 'Fehler beim Abrufen der Reflexionen' });
  }
};

export const getTodayReflection = async (req: AuthRequest, res: Response) => {
  try {
    const date = todayUtc();
    const prompt = promptForDate(date);

    const reflection = await prisma.reflection.findUnique({
      where: { userId_date: { userId: req.userId!, date } },
    });

    // Return the prompt even before an entry exists, so the UI can show today's question.
    return res.json({ reflection, prompt, date });
  } catch (error) {
    console.error('GetTodayReflection error:', error);
    return res.status(500).json({ error: 'Fehler beim Abrufen der heutigen Reflexion' });
  }
};

export const upsertTodayReflection = async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;

    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Inhalt ist erforderlich' });
    }

    const date = todayUtc();
    const prompt = promptForDate(date);

    const reflection = await prisma.reflection.upsert({
      where: { userId_date: { userId: req.userId!, date } },
      create: { userId: req.userId!, date, prompt, content },
      update: { content },
    });

    return res.json({ reflection });
  } catch (error) {
    console.error('UpsertTodayReflection error:', error);
    return res.status(500).json({ error: 'Fehler beim Speichern der Reflexion' });
  }
};
