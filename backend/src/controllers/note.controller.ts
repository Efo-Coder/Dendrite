import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';
import { extractUploadUrls, deleteFiles } from '../utils/imageCleanup';

const NOTE_INCLUDE = {
  folder: true,
  attachments: true,
  noteTags: { include: { tag: true }, orderBy: { createdAt: 'asc' as const } },
  collaborators: {
    where: { status: 'accepted' },
    select: { id: true, userId: true, role: true, status: true, user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  },
};

function transformNote(note: any) {
  const { noteTags, ...rest } = note;
  return { ...rest, tags: (noteTags ?? []).map((nt: any) => nt.tag) };
}

async function applyPreferences(notes: any[], userId: string): Promise<any[]> {
  if (notes.length === 0) return notes;
  const noteIds = notes.map(n => n.id);
  const [prefs, userTags] = await Promise.all([
    prisma.userNotePreference.findMany({ where: { userId, noteId: { in: noteIds } } }),
    prisma.userNoteTag.findMany({
      where: { userId, noteId: { in: noteIds } },
      include: { tag: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const prefMap = new Map(prefs.map(p => [p.noteId, p]));
  const tagMap = new Map<string, any[]>();
  for (const ut of userTags) {
    if (!tagMap.has(ut.noteId)) tagMap.set(ut.noteId, []);
    tagMap.get(ut.noteId)!.push(ut.tag);
  }

  // Fetch overridden folders if needed
  const overriddenFolderIds = new Set<string>();
  for (const pref of prefs) {
    if (pref.folderOverrideSet && pref.folderId) overriddenFolderIds.add(pref.folderId);
  }
  const folderMap = new Map<string, any>();
  if (overriddenFolderIds.size > 0) {
    const folders = await prisma.folder.findMany({ where: { id: { in: Array.from(overriddenFolderIds) } } });
    for (const f of folders) folderMap.set(f.id, f);
  }

  return notes.map(note => {
    const pref = prefMap.get(note.id);
    const tags = tagMap.get(note.id);
    let folderId: string | null = null;
    let folder: any = null;
    if (pref?.folderOverrideSet) {
      folderId = pref.folderId;
      folder = pref.folderId ? (folderMap.get(pref.folderId) ?? null) : null;
    }
    return {
      ...note,
      isPinned: pref?.isPinned ?? false,
      isFavorite: pref?.isFavorite ?? false,
      folderId,
      folder,
      tags: tags ?? [],
    };
  });
}


export const getAllNotes = async (req: AuthRequest, res: Response) => {
  try {
    const { folderId, tagId, pinned, favorite, archived, deleted, shared } = req.query;

    // Shared-with-me view
    if (shared === 'true') {
      const collabs = await prisma.noteCollaborator.findMany({
        where: { userId: req.userId!, status: 'accepted' },
        include: { note: { include: NOTE_INCLUDE } },
        orderBy: { acceptedAt: 'desc' },
      });
      const notes = await applyPreferences(
        collabs.map((c: any) => transformNote(c.note)),
        req.userId!
      );
      notes.sort((a: any, b: any) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      return res.json({ notes });
    }

    const where: any = { userId: req.userId };

    if (folderId) where.folderId = folderId as string;
    if (tagId) where.noteTags = { some: { tagId: tagId as string } };
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
    } else if (tagId) {
      contextType = 'tag';
      contextId = tagId as string;
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
          noteId: { in: notes.map((n: any) => n.id) },
        },
      });

      const orderMap = new Map(noteOrders.map(no => [no.noteId, no.order]));

      const notesWithOrder = notes.filter((n: any) => orderMap.has(n.id));
      const notesWithoutOrder = notes.filter((n: any) => !orderMap.has(n.id));

      notesWithOrder.sort((a: any, b: any) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return orderMap.get(a.id)! - orderMap.get(b.id)!;
      });

      notesWithoutOrder.sort((a: any, b: any) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      return res.json({ notes: [...notesWithOrder, ...notesWithoutOrder] });
    }

    return res.json({ notes });
  } catch (error) {
    console.error('GetAllNotes error:', error);
    return res.status(500).json({ error: 'Fehler beim Abrufen der Notizen' });
  }
};

export const getNoteCounts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const [all, favorites, archive, trash, shared, pendingInvitations] = await Promise.all([
      prisma.note.count({ where: { userId, isArchived: false, isDeleted: false } }),
      prisma.note.count({ where: { userId, isFavorite: true, isArchived: false, isDeleted: false } }),
      prisma.note.count({ where: { userId, isArchived: true, isDeleted: false } }),
      prisma.note.count({ where: { userId, isDeleted: true } }),
      prisma.noteCollaborator.count({ where: { userId: userId!, status: 'accepted' } }),
      prisma.noteCollaborator.count({ where: { userId: userId!, status: 'pending' } }),
    ]);
    return res.json({ all, favorites, archive, trash, shared, pendingInvitations });
  } catch (error) {
    return res.status(500).json({ error: 'Fehler beim Abrufen der Counts' });
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

export const createNote = async (req: AuthRequest, res: Response) => {
  try {
    const { content, folderId, tags } = req.body;

    if (content === undefined || content === null) {
      return res.status(400).json({ error: 'Inhalt ist erforderlich' });
    }

    const raw = await prisma.note.create({
      data: {
        content,
        userId: req.userId!,
        folderId: folderId || null,
        noteTags: tags ? { create: (tags as string[]).map((tagId: string) => ({ tagId })) } : undefined,
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
    const { title, content, folderId, tags } = req.body;

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

    if (isOwner && tags !== undefined) {
      const existing = await prisma.noteTag.findMany({ where: { noteId: id }, select: { tagId: true } });
      const existingIds = existing.map(e => e.tagId);
      const toAdd = (tags as string[]).filter(tid => !existingIds.includes(tid));
      const toRemove = existingIds.filter(tid => !(tags as string[]).includes(tid));

      await prisma.$transaction([
        prisma.noteTag.deleteMany({ where: { noteId: id, tagId: { in: toRemove } } }),
        ...toAdd.map(tagId => prisma.noteTag.create({ data: { noteId: id, tagId } })),
      ]);
    }

    if (!isOwner && tags !== undefined) {
      const existing = await prisma.userNoteTag.findMany({
        where: { noteId: id, userId: req.userId! },
        select: { tagId: true },
      });
      const existingIds = existing.map(e => e.tagId);
      const toAdd = (tags as string[]).filter(tid => !existingIds.includes(tid));
      const toRemove = existingIds.filter(tid => !(tags as string[]).includes(tid));

      await prisma.$transaction([
        prisma.userNoteTag.deleteMany({ where: { noteId: id, userId: req.userId!, tagId: { in: toRemove } } }),
        ...toAdd.map(tagId => prisma.userNoteTag.create({ data: { noteId: id, tagId, userId: req.userId! } })),
      ]);
    }

    if (!isOwner && folderId !== undefined) {
      await prisma.userNotePreference.upsert({
        where: { noteId_userId: { noteId: id, userId: req.userId! } },
        create: { noteId: id, userId: req.userId!, folderId: folderId || null, folderOverrideSet: true },
        update: { folderId: folderId || null, folderOverrideSet: true },
      });
    }

    const raw = await prisma.note.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existingNote.title,
        content: content !== undefined ? content : existingNote.content,
        folderId: isOwner && folderId !== undefined ? folderId : existingNote.folderId,
      },
      include: NOTE_INCLUDE,
    });

    // Version-Snapshot nur wenn Content geändert wurde und Owner ist
    if (isOwner && content !== undefined && content !== existingNote.content) {
      await maybeCreateVersion(id, existingNote.content, existingNote.title, req.userId!);
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

export const searchNotes = async (req: AuthRequest, res: Response) => {
  try {
    const q = req.query.q as string;

    if (!q) {
      return res.status(400).json({ error: 'Suchbegriff erforderlich' });
    }

    const rawNotes = await prisma.note.findMany({
      where: {
        userId: req.userId,
        content: { contains: q, mode: 'insensitive' },
      },
      include: NOTE_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });

    return res.json({ notes: rawNotes.map(transformNote) });
  } catch (error) {
    console.error('SearchNotes error:', error);
    return res.status(500).json({ error: 'Fehler bei der Suche' });
  }
};

export const togglePin = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

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

    if (isOwner) {
      const raw = await prisma.note.update({
        where: { id },
        data: { isPinned: !note.isPinned },
        include: NOTE_INCLUDE,
      });
      return res.json({ note: transformNote(raw) });
    }

    const existing = await prisma.userNotePreference.findUnique({
      where: { noteId_userId: { noteId: id, userId: req.userId! } },
    });
    const currentPinned = existing?.isPinned ?? note.isPinned;
    await prisma.userNotePreference.upsert({
      where: { noteId_userId: { noteId: id, userId: req.userId! } },
      create: { noteId: id, userId: req.userId!, isPinned: !currentPinned },
      update: { isPinned: !currentPinned },
    });

    const raw = await prisma.note.findFirst({ where: { id }, include: NOTE_INCLUDE });
    const [withPref] = await applyPreferences([transformNote(raw)], req.userId!);
    return res.json({ note: withPref });
  } catch (error) {
    console.error('TogglePin error:', error);
    return res.status(500).json({ error: 'Fehler beim Pinnen der Notiz' });
  }
};

export const toggleFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

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

    if (isOwner) {
      const raw = await prisma.note.update({
        where: { id },
        data: { isFavorite: !note.isFavorite },
        include: NOTE_INCLUDE,
      });
      return res.json({ note: transformNote(raw) });
    }

    const existing = await prisma.userNotePreference.findUnique({
      where: { noteId_userId: { noteId: id, userId: req.userId! } },
    });
    const currentFav = existing?.isFavorite ?? note.isFavorite;
    await prisma.userNotePreference.upsert({
      where: { noteId_userId: { noteId: id, userId: req.userId! } },
      create: { noteId: id, userId: req.userId!, isFavorite: !currentFav },
      update: { isFavorite: !currentFav },
    });

    const raw = await prisma.note.findFirst({ where: { id }, include: NOTE_INCLUDE });
    const [withPref] = await applyPreferences([transformNote(raw)], req.userId!);
    return res.json({ note: withPref });
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
      data: { isDeleted: !note.isDeleted },
      include: NOTE_INCLUDE,
    });

    return res.json({ note: transformNote(raw) });
  } catch (error) {
    console.error('ToggleDelete error:', error);
    return res.status(500).json({ error: 'Fehler beim Löschen der Notiz' });
  }
};

const VERSION_LIMITS: Record<string, number> = {
  free: 5,
  writer: 50,
  author: Infinity,
};

const VERSION_MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 Minuten

async function maybeCreateVersion(noteId: string, content: string, title: string | null, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  const plan = (user?.plan ?? 'free').toLowerCase();
  const limit = VERSION_LIMITS[plan] ?? 5;

  const latest = await prisma.noteVersion.findFirst({
    where: { noteId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  const now = Date.now();
  if (latest && now - latest.createdAt.getTime() < VERSION_MIN_INTERVAL_MS) return;

  await prisma.noteVersion.create({ data: { noteId, content, title } });

  if (limit !== Infinity) {
    const all = await prisma.noteVersion.findMany({
      where: { noteId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (all.length > limit) {
      const toDelete = all.slice(limit).map(v => v.id);
      await prisma.noteVersion.deleteMany({ where: { id: { in: toDelete } } });
    }
  }
}

export const getNoteVersions = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const note = await prisma.note.findFirst({ where: { id, userId: req.userId } });
    if (!note) return res.status(404).json({ error: 'Notiz nicht gefunden' });

    const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { plan: true } });
    const plan = (user?.plan ?? 'free').toLowerCase();
    const limit = VERSION_LIMITS[plan] ?? 5;

    const versions = await prisma.noteVersion.findMany({
      where: { noteId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, createdAt: true },
      take: limit === Infinity ? undefined : limit,
    });

    return res.json({ versions, plan });
  } catch (error) {
    console.error('GetNoteVersions error:', error);
    return res.status(500).json({ error: 'Fehler beim Abrufen der Versionen' });
  }
};

export const restoreNoteVersion = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const versionId = req.params.versionId as string;

    const note = await prisma.note.findFirst({ where: { id, userId: req.userId } });
    if (!note) return res.status(404).json({ error: 'Notiz nicht gefunden' });

    const version = await prisma.noteVersion.findFirst({ where: { id: versionId, noteId: id } });
    if (!version) return res.status(404).json({ error: 'Version nicht gefunden' });

    // Aktuellen Stand als neue Version sichern bevor wir überschreiben
    await prisma.noteVersion.create({ data: { noteId: id, content: note.content, title: note.title } });

    const raw = await prisma.note.update({
      where: { id },
      data: { content: version.content, title: version.title ?? note.title },
      include: NOTE_INCLUDE,
    });

    return res.json({ note: transformNote(raw) });
  } catch (error) {
    console.error('RestoreNoteVersion error:', error);
    return res.status(500).json({ error: 'Fehler beim Wiederherstellen der Version' });
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

export const exportNoteToPdf = async (req: AuthRequest, res: Response) => {
  try {
    const [note, user] = await Promise.all([
      prisma.note.findFirst({ where: { id: req.params.id, userId: req.userId! } }),
      prisma.user.findUnique({ where: { id: req.userId! }, select: { plan: true } }),
    ]);

    if (!note) return res.status(404).json({ error: 'Note not found' });

    const plan = (user?.plan || 'free').toLowerCase();
    if (plan !== 'writer' && plan !== 'author') {
      return res.status(403).json({ error: 'Writer plan required' });
    }

    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    const safeTitle = (note.title || 'Note').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>${safeTitle}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 2rem; line-height: 1.6; color: #111; }
  img { max-width: 100%; }
  h1 { font-size: 2rem; margin-bottom: 1rem; }
  pre { background: #f3f4f6; padding: 1rem; border-radius: 4px; overflow-x: auto; font-size: 0.875rem; }
  code { font-family: monospace; font-size: 0.875em; background: #f3f4f6; padding: 0.1em 0.3em; border-radius: 3px; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
  th, td { border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; text-align: left; }
  th { background: #f9fafb; font-weight: 600; }
  blockquote { border-left: 3px solid #d1d5db; margin: 1rem 0; padding: 0 1rem; color: #6b7280; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
</style>
</head>
<body>
<h1>${safeTitle}</h1>
${note.content || ''}
</body>
</html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' }, printBackground: true });
    await browser.close();

    const filename = encodeURIComponent(note.title || 'Note') + '.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    return res.send(Buffer.from(pdf));
  } catch (error) {
    console.error('exportNoteToPdf error:', error);
    return res.status(500).json({ error: 'PDF-Generierung fehlgeschlagen' });
  }
};
