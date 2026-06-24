import { prisma } from '../lib/prisma';
import { generateUniqueUsername } from '../lib/username';

// Derives a unique handle from `source` (name or email), checked against the live
// User table. Wraps the DB-free helper so lib/username stays decoupled from Prisma.
// The unique index on User.username is the final guard against the rare race where
// two registrations resolve to the same handle between the check and the insert.
export function pickUsername(source: string): Promise<string> {
  return generateUniqueUsername(source, async candidate => {
    const existing = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    return existing !== null;
  });
}
