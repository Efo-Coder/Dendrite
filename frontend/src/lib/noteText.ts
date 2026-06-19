import { Note } from '../types';

// Display label for a note: its title, else the first non-empty line of the content.
export function noteLabel(note: Note): string {
  const t = note.title?.trim();
  if (t) return t;
  const firstLine = note.content?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return firstLine ? firstLine.slice(0, 70) : 'Untitled';
}

// "1 note" / "5 notes" — the count line under a view's headline.
export function noteCountLabel(n: number): string {
  return `${n} ${n === 1 ? 'note' : 'notes'}`;
}
