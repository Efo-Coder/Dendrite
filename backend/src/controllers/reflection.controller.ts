import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── Daily prompts ─────────────────────────────────────────────────────────
// Curated, calm, literary voice — one shared impulse per day, not SaaS-speak.
const REFLECTION_PROMPTS = [
  'What idea deserves more attention?',
  'What did you notice today that you almost missed?',
  'What are you still turning over in your mind?',
  'What would you like to understand more deeply?',
  'What felt true today, even if you can’t explain why?',
  'What is one thing worth remembering from today?',
  'What question are you avoiding?',
  'What changed its meaning for you recently?',
  'What are you grateful to be working on?',
  'What would you tell yourself a year ago?',
  'What small thing brought you back to yourself today?',
  'What are you ready to let go of?',
  'What is taking shape, slowly, in the background?',
  'What did someone say that stayed with you?',
];

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
