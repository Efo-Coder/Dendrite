import { Note } from '../../types';

// Month bucket label of a note, e.g. "JUN 2026".
export const monthKeyOf = (n: Note) =>
  new Date(n.updatedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }).toUpperCase();
