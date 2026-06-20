import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { stripHtml } from '../services/constellationText';
import { notifyNoteLike } from '../services/notification.service';

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
  viewCount: true,
  likeCount: true,
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

    // Filters: author (profiles/following), full-text q, topic, recency, reading time.
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const author = typeof req.query.author === 'string' ? req.query.author : undefined;
    const topic = typeof req.query.topic === 'string' ? req.query.topic : undefined;
    const days = parseInt(String(req.query.days ?? ''), 10);
    const maxReadingTime = parseInt(String(req.query.maxReadingTime ?? ''), 10);

    const where: Prisma.PublishedNoteWhereInput = { visibility: 'public' };
    if (author) where.ownerId = author;
    if (topic) where.topics = { has: topic };
    if (Number.isFinite(days) && days > 0) {
      where.publishedAt = { gte: new Date(Date.now() - days * 86_400_000) };
    }
    if (Number.isFinite(maxReadingTime) && maxReadingTime > 0) {
      where.readingTime = { lte: maxReadingTime };
    }
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
        { tags: { has: q } },
        { owner: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const orderBy: Prisma.PublishedNoteOrderByWithRelationInput[] =
      req.query.sort === 'trending'
        ? [{ likeCount: 'desc' }, { publishedAt: 'desc' }]
        : [{ publishedAt: 'desc' }];

    const [items, total] = await Promise.all([
      prisma.publishedNote.findMany({
        where,
        select: cardSelect,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.publishedNote.count({ where }),
    ]);

    // Mark which of these the viewer has liked — one extra query, no N+1.
    const likedSet = new Set<string>();
    if (items.length > 0) {
      const liked = await prisma.publishedNoteLike.findMany({
        where: { userId: req.userId!, publishedNoteId: { in: items.map((i) => i.id) } },
        select: { publishedNoteId: true },
      });
      for (const l of liked) likedSet.add(l.publishedNoteId);
    }
    const withLiked = items.map((i) => ({ ...i, isLiked: likedSet.has(i.id) }));

    return res.json({ items: withLiked, total, page, limit });
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

    // Count a view, but never the author's own opens.
    let viewCount = publication.viewCount;
    if (publication.owner.id !== req.userId) {
      await prisma.publishedNote.update({ where: { id }, data: { viewCount: { increment: 1 } } });
      viewCount += 1;
    }

    const liked = await prisma.publishedNoteLike.findUnique({
      where: { userId_publishedNoteId: { userId: req.userId!, publishedNoteId: id } },
    });

    return res.json({ publication: { ...publication, viewCount, isLiked: !!liked } });
  } catch (error) {
    console.error('GetPublishedById error:', error);
    return res.status(500).json({ error: 'Failed to load published note' });
  }
};

// Like / unlike a published note. Idempotent; keeps the denormalized likeCount in
// sync with the like rows via a transaction.
export const likeNote = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const pub = await prisma.publishedNote.findFirst({
      where: { id, visibility: 'public' },
      select: { id: true, ownerId: true, title: true },
    });
    if (!pub) return res.status(404).json({ error: 'Published note not found' });

    const existing = await prisma.publishedNoteLike.findUnique({
      where: { userId_publishedNoteId: { userId: req.userId!, publishedNoteId: id } },
    });
    if (!existing) {
      await prisma.$transaction([
        prisma.publishedNoteLike.create({ data: { userId: req.userId!, publishedNoteId: id } }),
        prisma.publishedNote.update({ where: { id }, data: { likeCount: { increment: 1 } } }),
      ]);
      // Notify the author of a genuinely new like (never their own).
      if (pub.ownerId !== req.userId) {
        const liker = await prisma.user.findUnique({
          where: { id: req.userId! },
          select: { id: true, name: true, avatarUrl: true },
        });
        if (liker) {
          await notifyNoteLike(pub.ownerId, {
            publishedNoteId: id,
            noteTitle: pub.title,
            fromUserId: liker.id,
            fromName: liker.name,
            fromAvatarUrl: liker.avatarUrl,
          });
        }
      }
    }

    const updated = await prisma.publishedNote.findUnique({ where: { id }, select: { likeCount: true } });
    return res.json({ liked: true, likeCount: updated?.likeCount ?? 0 });
  } catch (error) {
    console.error('LikeNote error:', error);
    return res.status(500).json({ error: 'Failed to like note' });
  }
};

export const unlikeNote = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.publishedNoteLike.findUnique({
      where: { userId_publishedNoteId: { userId: req.userId!, publishedNoteId: id } },
    });
    if (existing) {
      await prisma.$transaction([
        prisma.publishedNoteLike.delete({
          where: { userId_publishedNoteId: { userId: req.userId!, publishedNoteId: id } },
        }),
        prisma.publishedNote.update({ where: { id }, data: { likeCount: { decrement: 1 } } }),
      ]);
    }

    const updated = await prisma.publishedNote.findUnique({ where: { id }, select: { likeCount: true } });
    return res.json({ liked: false, likeCount: updated?.likeCount ?? 0 });
  } catch (error) {
    console.error('UnlikeNote error:', error);
    return res.status(500).json({ error: 'Failed to unlike note' });
  }
};
