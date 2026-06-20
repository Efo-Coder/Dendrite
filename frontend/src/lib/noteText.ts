import { Note } from '../types';

// Display label for a note: its title-header text, else "Untitled".
export function noteLabel(note: Note): string {
  return note.title?.trim() || 'Untitled';
}

// "1 note" / "5 notes" — the count line under a view's headline.
export function noteCountLabel(n: number): string {
  return `${n} ${n === 1 ? 'note' : 'notes'}`;
}
