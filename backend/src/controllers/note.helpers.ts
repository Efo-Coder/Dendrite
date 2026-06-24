import { Folder, Prisma, Bookmark } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const NOTE_INCLUDE = {
  space: true,
  folder: true,
  attachments: true,
  noteBookmarks: { include: { bookmark: true }, orderBy: { createdAt: 'asc' as const } },
  collaborators: {
    where: { status: 'accepted' },
    select: {
      id: true,
      userId: true,
      role: true,
      status: true,
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  },
} satisfies Prisma.NoteInclude;

export type NoteWithRelations = Prisma.NoteGetPayload<{ include: typeof NOTE_INCLUDE }>;

// API shape: noteBookmarks flattened to bookmarks; for collaborators, isPinned /
// isFavorite / folder may be replaced by their personal preference.
export type ApiNote = Omit<NoteWithRelations, 'noteBookmarks'> & { bookmarks: Bookmark[] };

export function transformNote(note: NoteWithRelations): ApiNote {
  const { noteBookmarks, ...rest } = note;
  return { ...rest, bookmarks: noteBookmarks.map(nb => nb.bookmark) };
}

export function sortPinnedFirst(a: ApiNote, b: ApiNote): number {
  if (a.isPinned && !b.isPinned) return -1;
  if (!a.isPinned && b.isPinned) return 1;
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

// Context order for a note list: pinned first, then — within pinned and within the
// rest — the cards without a saved order (i.e. newly added) lead by recency, ahead of
// the manually ordered ones. So a freshly created/added card always lands up front.
export function sortByContextOrder(notes: ApiNote[], orderMap: Map<string, number>): ApiNote[] {
  const byRecency = (a: ApiNote, b: ApiNote) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  const byOrder = (a: ApiNote, b: ApiNote) => orderMap.get(a.id)! - orderMap.get(b.id)!;

  const pinnedOrdered: ApiNote[] = [];
  const pinnedNew: ApiNote[] = [];
  const restNew: ApiNote[] = [];
  const restOrdered: ApiNote[] = [];
  for (const n of notes) {
    const has = orderMap.has(n.id);
    if (n.isPinned) (has ? pinnedOrdered : pinnedNew).push(n);
    else (has ? restOrdered : restNew).push(n);
  }
  pinnedOrdered.sort(byOrder);
  pinnedNew.sort(byRecency);
  restNew.sort(byRecency);
  restOrdered.sort(byOrder);
  return [...pinnedOrdered, ...pinnedNew, ...restNew, ...restOrdered];
}

// Apply a user's saved drag order for one context to a note list (reuses the
// pinned-first reconcile). Empty list short-circuits the DB hit.
export async function orderForContext(
  notes: ApiNote[],
  userId: string,
  contextType: string,
  contextId = '_none',
): Promise<ApiNote[]> {
  if (notes.length === 0) return notes;
  const noteOrders = await prisma.noteOrder.findMany({
    where: { userId, contextType, contextId, noteId: { in: notes.map(n => n.id) } },
  });
  const orderMap = new Map(noteOrders.map(no => [no.noteId, no.order]));
  return sortByContextOrder(notes, orderMap);
}

// Shared notes carry per-user state: collaborators pin, favorite, bookmark and
// file notes for themselves without touching the owner's note.
export async function applyPreferences(notes: ApiNote[], userId: string): Promise<ApiNote[]> {
  if (notes.length === 0) return notes;
  const noteIds = notes.map(n => n.id);
  const [prefs, userBookmarks] = await Promise.all([
    prisma.userNotePreference.findMany({ where: { userId, noteId: { in: noteIds } } }),
    prisma.userNoteBookmark.findMany({
      where: { userId, noteId: { in: noteIds } },
      include: { bookmark: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const prefMap = new Map(prefs.map(p => [p.noteId, p]));
  const bookmarkMap = new Map<string, Bookmark[]>();
  for (const ub of userBookmarks) {
    if (!bookmarkMap.has(ub.noteId)) bookmarkMap.set(ub.noteId, []);
    bookmarkMap.get(ub.noteId)!.push(ub.bookmark);
  }

  const overriddenFolderIds = new Set<string>();
  for (const pref of prefs) {
    if (pref.folderOverrideSet && pref.folderId) overriddenFolderIds.add(pref.folderId);
  }
  const folderMap = new Map<string, Folder>();
  if (overriddenFolderIds.size > 0) {
    const folders = await prisma.folder.findMany({
      where: { id: { in: Array.from(overriddenFolderIds) } },
    });
    for (const f of folders) folderMap.set(f.id, f);
  }

  return notes.map(note => {
    const pref = prefMap.get(note.id);
    const bookmarks = bookmarkMap.get(note.id);
    let folderId: string | null = null;
    let folder: Folder | null = null;
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
      bookmarks: bookmarks ?? [],
    };
  });
}
