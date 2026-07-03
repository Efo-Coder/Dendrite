import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { extractUploadUrls, deleteFiles } from '../utils/imageCleanup';
import { NOTE_INCLUDE, applyPreferences, orderForContext, sortByContextOrder, toListItem, transformNote } from './note.helpers';
import { maybeCreateVersion } from '../services/noteVersion.service';

// A note's space is the folder's space when filed in a folder, otherwise the
// explicitly given space (validated to belong to the user), else null.
async function resolveNoteSpace(
  userId: string,
  folderId?: string | null,
  spaceId?: string | null,
): Promise<string | null> {
  if (folderId) {
    const folder = await prisma.folder.findFirst({ where: { id: folderId, userId }, select: { spaceId: true } });
    return folder?.spaceId ?? null;
  }
  if (spaceId) {
    const space = await prisma.space.findFirst({ where: { id: spaceId, userId }, select: { id: true } });
    return space ? spaceId : null;
  }
  return null;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export const getAllNotes = async (req: AuthRequest, res: Response) => {
  try {
    const { spaceId, folderId, bookmarkId, pinned, favorite, archived, deleted, shared } = req.query;

    // Shared view: notes shared with me (accepted collabs) plus my own notes
    // I've opened to others. Home shows them together; the full view splits them
    // into two groups, so each keeps its own personal drag order.
    if (shared === 'true') {
      const [collabs, owned] = await Promise.all([
        prisma.noteCollaborator.findMany({
          where: { userId: req.userId!, status: 'accepted' },
          include: { note: { include: NOTE_INCLUDE } },
          orderBy: { acceptedAt: 'desc' },
        }),
        prisma.note.findMany({
          where: {
            userId: req.userId!,
            isDeleted: false,
            collaborators: { some: { status: 'accepted' } },
          },
          include: NOTE_INCLUDE,
          orderBy: { updatedAt: 'desc' },
        }),
      ]);

      const withMe = await applyPreferences(collabs.map(c => transformNote(c.note)), req.userId!);

      // The owner's pin for a shared note is a personal override (UserNotePreference),
      // independent of the note's own isPinned used by the normal views.
      const byMe = owned.map(transformNote);
      const ownerPins = byMe.length
        ? new Map((await prisma.userNotePreference.findMany({
            where: { userId: req.userId!, noteId: { in: byMe.map(n => n.id) } },
            select: { noteId: true, isPinned: true },
          })).map(p => [p.noteId, p.isPinned]))
        : new Map<string, boolean>();
      const byMePinned = byMe.map(n => ({ ...n, isPinned: ownerPins.get(n.id) ?? false }));

      const [orderedWithMe, orderedByMe] = await Promise.all([
        orderForContext(withMe, req.userId!, 'shared'),
        orderForContext(byMePinned, req.userId!, 'shared-owned'),
      ]);

      return res.json({ notes: [...orderedWithMe, ...orderedByMe].map(toListItem) });
    }

    const where: Prisma.NoteWhereInput = { userId: req.userId };

    // A folder shows its own notes; a space shows only its direct (folderless) notes.
    if (folderId) where.folderId = folderId as string;
    else if (spaceId) { where.spaceId = spaceId as string; where.folderId = null; }
    if (bookmarkId) where.noteBookmarks = { some: { bookmarkId: bookmarkId as string } };
    if (pinned !== undefined) where.isPinned = pinned === 'true';
    if (favorite !== undefined) where.isFavorite = favorite === 'true';
    if (archived !== undefined) where.isArchived = archived === 'true';
    if (deleted !== undefined) where.isDeleted = deleted === 'true';

    const rawNotes = await prisma.note.findMany({
      where,
      include: NOTE_INCLUDE,
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    });

    const notes = rawNotes.map(transformNote);

    let contextType = 'all';
    let contextId: string = '_none';

    if (folderId) {
      contextType = 'folder';
      contextId = folderId as string;
    } else if (spaceId) {
      contextType = 'space';
      contextId = spaceId as string;
    } else if (bookmarkId) {
      // Internal context key stays 'tag' so saved drag orders keep their reference.
      contextType = 'tag';
      contextId = bookmarkId as string;
    } else if (favorite === 'true') {
      contextType = 'favorites';
    } else if (archived === 'true') {
      contextType = 'archive';
    }

    if (deleted !== 'true' && notes.length > 0) {
      const noteOrders = await prisma.noteOrder.findMany({
        where: {
          userId: req.userId,
          contextType,
          contextId,
          noteId: { in: notes.map(n => n.id) },
        },
      });

      const orderMap = new Map(noteOrders.map(no => [no.noteId, no.order]));
      return res.json({ notes: sortByContextOrder(notes, orderMap).map(toListItem) });
    }

    return res.json({ notes: notes.map(toListItem) });
  } catch (error) {
    console.error('GetAllNotes error:', error);
    return res.status(500).json({ error: 'Fehler beim Abrufen der Notizen' });
  }
};

export const getNoteById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const raw = await prisma.note.findFirst({
      where: {
        id,
        OR: [
          { userId: req.userId },
          { collaborators: { some: { userId: req.userId!, status: 'accepted' } } },
        ],
      },
      include: NOTE_INCLUDE,
    });

    if (!raw) {
      return res.status(404).json({ error: 'Notiz nicht gefunden' });
    }

    const transformed = transformNote(raw);
    const isOwner = raw.userId === req.userId;
    if (!isOwner) {
      const [withPref] = await applyPreferences([transformed], req.userId!);
      return res.json({ note: withPref });
    }
    return res.json({ note: transformed });
  } catch (error) {
    console.error('GetNoteById error:', error);
    return res.status(500).json({ error: 'Fehler beim Abrufen der Notiz' });
  }
};

// Unbounded search results saturate the DB pool under load (a broad term can
// match a whole corpus, each row carrying five includes) — cap what one query
// may assemble. 50 rows is more than the search UI ever shows.
const MAX_SEARCH_RESULTS = 50;

export const searchNotes = async (req: AuthRequest, res: Response) => {
  try {
    const q = (req.query.q as string | undefined)?.trim() ?? '';

    if (!q) {
      return res.status(400).json({ error: 'Suchbegriff erforderlich' });
    }
    // Single characters match nearly everything; not worth a corpus scan.
    if (q.length < 2) {
      return res.json({ notes: [] });
    }

    const rawNotes = await prisma.note.findMany({
      where: {
        userId: req.userId,
        content: { contains: q, mode: 'insensitive' },
      },
      include: NOTE_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      take: MAX_SEARCH_RESULTS,
    });

    return res.json({ notes: rawNotes.map(n => toListItem(transformNote(n))) });
  } catch (error) {
    console.error('SearchNotes error:', error);
    return res.status(500).json({ error: 'Fehler bei der Suche' });
  }
};

// ─── Mutations ───────────────────────────────────────────────────────────────

export const createNote = async (req: AuthRequest, res: Response) => {
  try {
    const { content, spaceId, folderId, coverImage, bookmarks } = req.body;

    if (content === undefined || content === null) {
      return res.status(400).json({ error: 'Inhalt ist erforderlich' });
    }

    // A note in a folder always belongs to that folder's space; otherwise it sits
    // directly in the given space (or top-level when neither is set).
    const resolvedSpaceId = await resolveNoteSpace(req.userId!, folderId, spaceId);

    const raw = await prisma.note.create({
      data: {
        content,
        userId: req.userId!,
        spaceId: resolvedSpaceId,
        folderId: folderId || null,
        coverImage: coverImage || null,
        noteBookmarks: bookmarks ? { create: (bookmarks as string[]).map((bookmarkId: string) => ({ bookmarkId })) } : undefined,
      },
      include: NOTE_INCLUDE,
    });

    return res.status(201).json({ note: transformNote(raw) });
  } catch (error) {
    console.error('CreateNote error:', error);
    return res.status(500).json({ error: 'Fehler beim Erstellen der Notiz' });
  }
};

export const updateNote = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { title, content, spaceId, folderId, coverImage, bookmarks } = req.body;

    const existingNote = await prisma.note.findFirst({
      where: {
        id,
        OR: [
          { userId: req.userId },
          { collaborators: { some: { userId: req.userId!, status: 'accepted' } } },
        ],
      },
    });

    if (!existingNote) {
      return res.status(404).json({ error: 'Notiz nicht gefunden' });
    }

    const isOwner = existingNote.userId === req.userId;

    if (content !== undefined && existingNote.content) {
      const oldUrls = extractUploadUrls(existingNote.content);
      const newUrls = extractUploadUrls(content);
      const removed = oldUrls.filter(url => !newUrls.includes(url));
      deleteFiles(removed);
    }

    if (isOwner && bookmarks !== undefined) {
      const existing = await prisma.noteBookmark.findMany({ where: { noteId: id }, select: { bookmarkId: true } });
      const existingIds = existing.map(e => e.bookmarkId);
      const toAdd = (bookmarks as string[]).filter(bid => !existingIds.includes(bid));
      const toRemove = existingIds.filter(bid => !(bookmarks as string[]).includes(bid));

      await prisma.$transaction([
        prisma.noteBookmark.deleteMany({ where: { noteId: id, bookmarkId: { in: toRemove } } }),
        ...toAdd.map(bookmarkId => prisma.noteBookmark.create({ data: { noteId: id, bookmarkId } })),
      ]);
    }

    if (!isOwner && bookmarks !== undefined) {
      const existing = await prisma.userNoteBookmark.findMany({
        where: { noteId: id, userId: req.userId! },
        select: { bookmarkId: true },
      });
      const existingIds = existing.map(e => e.bookmarkId);
      const toAdd = (bookmarks as string[]).filter(bid => !existingIds.includes(bid));
      const toRemove = existingIds.filter(bid => !(bookmarks as string[]).includes(bid));

      await prisma.$transaction([
        prisma.userNoteBookmark.deleteMany({ where: { noteId: id, userId: req.userId!, bookmarkId: { in: toRemove } } }),
        ...toAdd.map(bookmarkId => prisma.userNoteBookmark.create({ data: { noteId: id, bookmarkId, userId: req.userId! } })),
      ]);
    }

    if (!isOwner && folderId !== undefined) {
      await prisma.userNotePreference.upsert({
        where: { noteId_userId: { noteId: id, userId: req.userId! } },
        create: { noteId: id, userId: req.userId!, folderId: folderId || null, folderOverrideSet: true },
        update: { folderId: folderId || null, folderOverrideSet: true },
      });
    }

    const nextFolderId = isOwner && folderId !== undefined ? (folderId || null) : existingNote.folderId;
    const nextSpaceId =
      isOwner && (folderId !== undefined || spaceId !== undefined)
        ? await resolveNoteSpace(req.userId!, nextFolderId, spaceId)
        : existingNote.spaceId;

    const raw = await prisma.note.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existingNote.title,
        content: content !== undefined ? content : existingNote.content,
        coverImage: coverImage !== undefined ? coverImage : existingNote.coverImage,
        folderId: nextFolderId,
        spaceId: nextSpaceId,
      },
      include: NOTE_INCLUDE,
    });

    // Snapshot only when the owner actually changed the content. Decoupled from
    // the response: autosave latency must not pay for history bookkeeping.
    if (isOwner && content !== undefined && content !== existingNote.content) {
      maybeCreateVersion(id, existingNote.content, existingNote.title).catch((err) =>
        console.error('Version snapshot failed:', err),
      );
    }

    const transformed = transformNote(raw);
    if (!isOwner) {
      const [withPref] = await applyPreferences([transformed], req.userId!);
      return res.json({ note: withPref });
    }
    return res.json({ note: transformed });
  } catch (error) {
    console.error('UpdateNote error:', error);
    return res.status(500).json({ error: 'Fehler beim Aktualisieren der Notiz' });
  }
};

export const deleteNote = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const existingNote = await prisma.note.findFirst({
      where: { id, userId: req.userId },
      include: { attachments: true },
    });

    if (!existingNote) {
      return res.status(404).json({ error: 'Notiz nicht gefunden' });
    }

    if (existingNote.content) {
      deleteFiles(extractUploadUrls(existingNote.content));
    }

    deleteFiles(existingNote.attachments.map(a => a.url));

    await prisma.note.delete({ where: { id } });

    return res.json({ message: 'Notiz erfolgreich gelöscht' });
  } catch (error) {
    console.error('DeleteNote error:', error);
    return res.status(500).json({ error: 'Fehler beim Löschen der Notiz' });
  }
};

// ─── Flags & order ───────────────────────────────────────────────────────────

// Owners toggle the flag on the note itself; collaborators get a personal
// override stored in UserNotePreference instead.
async function toggleNoteFlag(req: AuthRequest, res: Response, flag: 'isPinned' | 'isFavorite') {
  const id = req.params.id as string;
  // The collaborations view pin is a personal override even for the owner, so it
  // stays independent of the note's own isPinned (used by the normal views).
  const collabPin = flag === 'isPinned' && req.body?.context === 'shared';

  const note = await prisma.note.findFirst({
    where: {
      id,
      OR: [
        { userId: req.userId },
        { collaborators: { some: { userId: req.userId!, status: 'accepted' } } },
      ],
    },
  });

  if (!note) {
    return res.status(404).json({ error: 'Notiz nicht gefunden' });
  }

  const isOwner = note.userId === req.userId;

  if (isOwner && !collabPin) {
    const raw = await prisma.note.update({
      where: { id },
      data: flag === 'isPinned' ? { isPinned: !note.isPinned } : { isFavorite: !note.isFavorite },
      include: NOTE_INCLUDE,
    });
    return res.json({ note: transformNote(raw) });
  }

  const existing = await prisma.userNotePreference.findUnique({
    where: { noteId_userId: { noteId: id, userId: req.userId! } },
  });
  // The owner's collab pin defaults to off (independent of the note's own pin);
  // a collaborator's override still falls back to the note's value.
  const current = existing?.[flag] ?? (isOwner ? false : note[flag]);
  const change = flag === 'isPinned' ? { isPinned: !current } : { isFavorite: !current };
  await prisma.userNotePreference.upsert({
    where: { noteId_userId: { noteId: id, userId: req.userId! } },
    create: { noteId: id, userId: req.userId!, ...change },
    update: change,
  });

  const raw = await prisma.note.findFirst({ where: { id }, include: NOTE_INCLUDE });
  if (!raw) {
    return res.status(404).json({ error: 'Notiz nicht gefunden' });
  }
  // Owner: keep the note's real favorite/folder/bookmarks, override only the collab pin.
  if (isOwner) {
    return res.json({ note: { ...transformNote(raw), isPinned: !current } });
  }
  const [withPref] = await applyPreferences([transformNote(raw)], req.userId!);
  return res.json({ note: withPref });
}

export const togglePin = async (req: AuthRequest, res: Response) => {
  try {
    return await toggleNoteFlag(req, res, 'isPinned');
  } catch (error) {
    console.error('TogglePin error:', error);
    return res.status(500).json({ error: 'Fehler beim Pinnen der Notiz' });
  }
};

export const toggleFavorite = async (req: AuthRequest, res: Response) => {
  try {
    return await toggleNoteFlag(req, res, 'isFavorite');
  } catch (error) {
    console.error('ToggleFavorite error:', error);
    return res.status(500).json({ error: 'Fehler beim Favorisieren der Notiz' });
  }
};

export const toggleArchive = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const note = await prisma.note.findFirst({ where: { id, userId: req.userId } });

    if (!note) {
      return res.status(404).json({ error: 'Notiz nicht gefunden' });
    }

    const raw = await prisma.note.update({
      where: { id },
      data: { isArchived: !note.isArchived },
      include: NOTE_INCLUDE,
    });

    return res.json({ note: transformNote(raw) });
  } catch (error) {
    console.error('ToggleArchive error:', error);
    return res.status(500).json({ error: 'Fehler beim Archivieren der Notiz' });
  }
};

export const toggleDelete = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const note = await prisma.note.findFirst({ where: { id, userId: req.userId } });

    if (!note) {
      return res.status(404).json({ error: 'Notiz nicht gefunden' });
    }

    const raw = await prisma.note.update({
      where: { id },
      // Stamp deletedAt when trashing (drives the 30-day auto-purge), clear it on restore.
      data: { isDeleted: !note.isDeleted, deletedAt: note.isDeleted ? null : new Date() },
      include: NOTE_INCLUDE,
    });

    return res.json({ note: transformNote(raw) });
  } catch (error) {
    console.error('ToggleDelete error:', error);
    return res.status(500).json({ error: 'Fehler beim Löschen der Notiz' });
  }
};

export const reorderNotes = async (req: AuthRequest, res: Response) => {
  try {
    const { noteOrders, contextType, contextId } = req.body;

    if (!Array.isArray(noteOrders)) {
      return res.status(400).json({ error: 'noteOrders muss ein Array sein' });
    }

    if (!contextType) {
      return res.status(400).json({ error: 'contextType ist erforderlich' });
    }

    await prisma.$transaction(
      noteOrders.map((item: { id: string; order: number }) =>
        prisma.noteOrder.upsert({
          where: {
            noteId_userId_contextType_contextId: {
              noteId: item.id,
              userId: req.userId!,
              contextType,
              contextId: contextId || '_none',
            },
          },
          create: {
            noteId: item.id,
            userId: req.userId!,
            contextType,
            contextId: contextId || '_none',
            order: item.order,
          },
          update: { order: item.order },
        })
      )
    );

    return res.json({ message: 'Reihenfolge erfolgreich aktualisiert' });
  } catch (error) {
    console.error('ReorderNotes error:', error);
    return res.status(500).json({ error: 'Fehler beim Aktualisieren der Reihenfolge' });
  }
};
