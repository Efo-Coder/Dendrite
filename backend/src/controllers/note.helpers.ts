import { Folder, Prisma, Tag } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const NOTE_INCLUDE = {
  folder: true,
  attachments: true,
  noteTags: { include: { tag: true }, orderBy: { createdAt: 'asc' as const } },
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

// API shape: noteTags flattened to tags; for collaborators, isPinned /
// isFavorite / folder may be replaced by their personal preference.
export type ApiNote = Omit<NoteWithRelations, 'noteTags'> & { tags: Tag[] };

export function transformNote(note: NoteWithRelations): ApiNote {
  const { noteTags, ...rest } = note;
  return { ...rest, tags: noteTags.map(nt => nt.tag) };
}

export function sortPinnedFirst(a: ApiNote, b: ApiNote): number {
  if (a.isPinned && !b.isPinned) return -1;
  if (!a.isPinned && b.isPinned) return 1;
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

// Shared notes carry per-user state: collaborators pin, favorite, tag and
// file notes for themselves without touching the owner's note.
export async function applyPreferences(notes: ApiNote[], userId: string): Promise<ApiNote[]> {
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
  const tagMap = new Map<string, Tag[]>();
  for (const ut of userTags) {
    if (!tagMap.has(ut.noteId)) tagMap.set(ut.noteId, []);
    tagMap.get(ut.noteId)!.push(ut.tag);
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
    const tags = tagMap.get(note.id);
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
      tags: tags ?? [],
    };
  });
}
