// Trashed notes are auto-purged after this many days (mirrors the backend cleanup job).
const RETENTION_DAYS = 30;
const DAY_MS = 86_400_000;

export type TrashTone = 'normal' | 'warn' | 'danger';

// Days left before a trashed note is permanently removed, plus an urgency tone for the
// subtitle. ceil + min 1 so it never reads "0 Days" between hourly purge runs.
export function trashCountdown(deletedAt: string | null | undefined): { text: string; tone: TrashTone } {
  const base = deletedAt ? new Date(deletedAt).getTime() : Date.now();
  const days = Math.max(1, Math.ceil((base + RETENTION_DAYS * DAY_MS - Date.now()) / DAY_MS));
  const tone: TrashTone = days <= 3 ? 'danger' : days <= 7 ? 'warn' : 'normal';
  return { text: days === 1 ? '1 Day' : `${days} Days`, tone };
}
