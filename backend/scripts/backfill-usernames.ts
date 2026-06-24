// One-off backfill: assigns a unique @handle to every existing user that has no
// username yet (run once after deploying the add_username migration).
//
//   npm run backfill:usernames
//
// Idempotent: users that already have a username are skipped, so re-running is safe.

import { prisma } from '../src/lib/prisma';
import { generateUniqueUsername } from '../src/lib/username';

async function main() {
  // Seed the in-memory set with handles already taken, so generation needs no
  // per-candidate DB round-trip.
  const taken = new Set<string>();
  const existing = await prisma.user.findMany({
    where: { username: { not: null } },
    select: { username: true },
  });
  for (const u of existing) if (u.username) taken.add(u.username);

  const todo = await prisma.user.findMany({
    where: { username: null },
    select: { id: true, name: true, email: true },
  });

  console.log(`Backfilling ${todo.length} user(s)…`);
  for (const u of todo) {
    const handle = await generateUniqueUsername(u.name || u.email, c => taken.has(c));
    taken.add(handle);
    await prisma.user.update({ where: { id: u.id }, data: { username: handle } });
    console.log(`  ${u.email} → @${handle}`);
  }
  console.log('Done.');
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
