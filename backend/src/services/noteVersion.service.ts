import { prisma } from '../lib/prisma';

const VERSION_MIN_INTERVAL_MS = 5 * 60 * 1000;
// Hard cap independent of plan — plan-based pruning happens in the frontend
const VERSION_STORAGE_CAP = 200;

export async function capVersions(noteId: string) {
  // Count first — the common case (under the cap) then costs one cheap query
  // instead of loading every version id on each snapshot.
  const count = await prisma.noteVersion.count({ where: { noteId } });
  if (count <= VERSION_STORAGE_CAP) return;
  const excess = await prisma.noteVersion.findMany({
    where: { noteId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
    skip: VERSION_STORAGE_CAP,
  });
  await prisma.noteVersion.deleteMany({ where: { id: { in: excess.map(v => v.id) } } });
}

// Snapshot at most every 5 minutes so rapid auto-saves don't flood the history
export async function maybeCreateVersion(noteId: string, content: string, title: string | null) {
  const latest = await prisma.noteVersion.findFirst({
    where: { noteId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  if (latest && Date.now() - latest.createdAt.getTime() < VERSION_MIN_INTERVAL_MS) return;

  await prisma.noteVersion.create({ data: { noteId, content, title } });
  await capVersions(noteId);
}
