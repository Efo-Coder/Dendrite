// Shared time helpers for the reminder dropdowns (kept out of the component files so
// fast-refresh stays happy and the picker + modal format times identically).
export const pad2 = (n: number) => String(n).padStart(2, '0');

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

// Locale label for a 'HH:mm' value; tolerates off-grid times from manual entry.
export function formatTimeLabel(time: string): string {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  return timeFmt.format(new Date(2000, 0, 1, h, m));
}
