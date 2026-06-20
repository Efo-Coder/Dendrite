import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { stripHtml } from '../services/constellationText';

// ─── Constants ───────────────────────────────────────────────────────────────

const WORDS_PER_MINUTE = 200;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

// Slim author shape shared by browse list + detail (never leak email here).
const authorSelect = { id: true, name: true, avatarUrl: true } as const;

// Browse cards never need the full body — omit `content` to keep lists light.
const cardSelect = {
  id: true,
  title: true,
  description: true,
  coverImage: true,
  tags: true,
  topics: true,
  readingTime: true,
  publishedAt: true,
  updatedAt: true,
  owner: { select: authorSelect },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeReadingTime(html: string): number {
  const words = stripHtml(html).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

// ─── Owner operations ────────────────────────────────────────────────────────

// Publish or update a publication. Snapshot (title/content/excerpt/readingTime) is
// re-frozen from the live note on every call, so this doubles as "Update publication".
export const publishNote = async (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id as string;

    const note = await prisma.note.findFirst({
      where: { id: noteId, userId: req.userId, isDeleted: false },
    });
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const description = typeof req.body.description === 'string' ? req.body.description : null;
    // Only fall back to the note's cover when the client omits the field entirely;
    // an explicit null means "publish without a cover".
    const coverImage =
      'coverImage' in req.body
        ? typeof req.body.coverImage === 'string'
          ? req.body.coverImage
          : null
        : note.coverImage;
    const tags = stringArray(req.body.tags);
    const topics = stringArray(req.body.topics);

    const snapshot = {
      title: note.title,
      content: note.content,
      readingTime: computeReadingTime(note.content),
      description,
      coverImage,
      tags,
      topics,
    };

    const publication = await prisma.publishedNote.upsert({
      where: { noteId },
      create: { noteId, ownerId: req.userId!, ...snapshot },
      update: snapshot,
      select: cardSelect,
    });

    return res.json({ publication });
  } catch (error) {
    console.error('PublishNote error:', error);
    return res.status(500).json({ error: 'Failed to publish note' });
  }
};

export const unpublishNote = async (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id as string;

    // Scope the delete to the owner so foreign notes can't be unpublished.
    const note = await prisma.note.findFirst({ where: { id: noteId, userId: req.userId } });
    if (!note) return res.status(404).json({ error: 'Note not found' });

    await prisma.publishedNote.deleteMany({ where: { noteId } });

    return res.json({ message: 'Note unpublished' });
  } catch (error) {
    console.error('UnpublishNote error:', error);
    return res.status(500).json({ error: 'Failed to unpublish note' });
  }
};

// Publication status for the editor's publish dialog (null when not published).
export const getMyPublication = async (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id as string;

    const note = await prisma.note.findFirst({ where: { id: noteId, userId: req.userId } });
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const publication = await prisma.publishedNote.findUnique({
      where: { noteId },
      select: cardSelect,
    });

    return res.json({ publication });
  } catch (error) {
    console.error('GetMyPublication error:', error);
    return res.status(500).json({ error: 'Failed to load publication' });
  }
};

// ─── Discovery (read-only) ───────────────────────────────────────────────────

// Recently published, paginated. Foundation for trending/featured later.
export const listPublished = async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(String(req.query.limit ?? DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
    );

    const where = { visibility: 'public' };

    const [items, total] = await Promise.all([
      prisma.publishedNote.findMany({
        where,
        select: cardSelect,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.publishedNote.count({ where }),
    ]);

    return res.json({ items, total, page, limit });
  } catch (error) {
    console.error('ListPublished error:', error);
    return res.status(500).json({ error: 'Failed to load published notes' });
  }
};

// Full published note (with content) for the Browse reading view.
export const getPublishedById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const publication = await prisma.publishedNote.findFirst({
      where: { id, visibility: 'public' },
      select: { ...cardSelect, content: true },
    });

    if (!publication) return res.status(404).json({ error: 'Published note not found' });

    return res.json({ publication });
  } catch (error) {
    console.error('GetPublishedById error:', error);
    return res.status(500).json({ error: 'Failed to load published note' });
  }
};
