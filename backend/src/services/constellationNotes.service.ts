import { prisma } from '../lib/prisma';
import { tokenize, uniqueTerms, firstLine } from './constellationText';

export interface ThemeNoteDTO {
  id: string;
  title: string | null;
  preview: string;
  updatedAt: string;
  folderId: string | null;
}

const MAX_THEME_NOTES = 400; // a single theme rarely exceeds this; bounds the payload

interface NoteRow {
  id: string;
  title: string | null;
  content: string;
  updatedAt: Date;
  folderId: string | null;
}

function toDTO(n: NoteRow): ThemeNoteDTO {
  return {
    id: n.id,
    title: n.title,
    preview: firstLine(n.content),
    updatedAt: n.updatedAt.toISOString(),
    folderId: n.folderId,
  };
}

// Notes belonging to a theme. Tag themes resolve by their tag; emergent keyword
// themes ('kw:<term>') resolve by content term presence, re-tokenized on demand.
export async function getConstellationNotes(userId: string, themeId: string): Promise<ThemeNoteDTO[]> {
  const baseSelect = { id: true, title: true, content: true, updatedAt: true, folderId: true } as const;

  if (themeId.startsWith('tag:')) {
    const bookmarkId = themeId.slice(4);
    const notes = await prisma.note.findMany({
      where: { userId, isDeleted: false, isArchived: false, noteBookmarks: { some: { bookmarkId } } },
      select: baseSelect,
      orderBy: { updatedAt: 'desc' },
      take: MAX_THEME_NOTES,
    });
    return notes.map(toDTO);
  }

  if (themeId.startsWith('kw:')) {
    const term = themeId.slice(3);
    const notes = await prisma.note.findMany({
      where: { userId, isDeleted: false, isArchived: false },
      select: baseSelect,
      orderBy: { updatedAt: 'desc' },
    });
    return notes
      .filter((n) => uniqueTerms(tokenize(n.content)).has(term))
      .slice(0, MAX_THEME_NOTES)
      .map(toDTO);
  }

  return [];
}
