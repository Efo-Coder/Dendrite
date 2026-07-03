// Seeds a deterministic load-test population for the k6 scenarios in loadtest/:
// verified users (fixed password + pre-signed JWTs), notes in realistic size
// mixes, bookmarks, accepted collaborations, publications with backdated likes,
// and follows. Only touches its own namespace: every run first deletes all
// users on the @loadtest.dendrite domain, so re-running is safe and real dev
// data is never affected.
//
//   docker exec dendrite-backend npx tsx scripts/loadtest-seed.ts
//
// Writes the fixture to /app/loadtest-seed.json (host: backend/loadtest-seed.json,
// gitignored — it contains valid JWTs). Progress logs go to stderr.

import { randomUUID } from 'crypto';
import { writeFileSync } from 'fs';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../src/lib/prisma';

// ─── Tunables ────────────────────────────────────────────────────────────────

const USERS = intEnv('SEED_USERS', 30);
const NOTES_PER_USER = intEnv('SEED_NOTES', 40);
// One "power user" with a large corpus makes table-scan costs (search, full
// list payloads) visible at local data volumes.
const POWER_NOTES = intEnv('SEED_POWER_NOTES', 1500);
const PUBLISHED_PER_USER = 5;
const LIKES_PER_USER = 20;
const FOLLOWS_PER_USER = 5;
const BOOKMARKS_PER_USER = 5;
const WRITER_USERS = 5; // first N users get the paid plan (needed for PDF export)

const DOMAIN = 'loadtest.dendrite';
const PASSWORD = 'LoadTest!234';
const DAY_MS = 86_400_000;
const CREATE_CHUNK = 500; // keep createMany statements bounded

function intEnv(name: string, fallback: number): number {
  const v = parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

// ─── Content generation ──────────────────────────────────────────────────────

// Mixed EN/DE words so both stopword paths and search terms behave like real
// notes; k6 reads its search terms from the fixture so the two stay in sync.
const WORDS = [
  'garden', 'memory', 'winter', 'morning', 'letter', 'silence', 'harvest', 'window',
  'journey', 'thought', 'pattern', 'shadow', 'library', 'evening', 'notebook', 'river',
  'gedanke', 'projekt', 'wasser', 'sommer', 'brief', 'garten', 'fenster', 'reise',
  'arbeit', 'wissen', 'stille', 'himmel', 'wurzel', 'faden', 'klang', 'papier',
];

const TOPICS = ['philosophy', 'productivity', 'journal', 'design', 'science'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sample<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function sentence(): string {
  const len = 6 + Math.floor(Math.random() * 10);
  const words = Array.from({ length: len }, () => pick(WORDS));
  return words.join(' ') + '.';
}

function paragraphHtml(): string {
  const sentences = Array.from({ length: 3 + Math.floor(Math.random() * 4) }, sentence);
  return `<p>${sentences.join(' ')}</p>`;
}

// Grows paragraphs until the note reaches the requested byte size, so the mix
// contains everything from short scribbles to essay-length documents.
function noteHtml(minBytes: number): string {
  let html = `<h2>${sentence()}</h2>`;
  while (html.length < minBytes) html += paragraphHtml();
  return html;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

// ─── Seeding ─────────────────────────────────────────────────────────────────

interface SeedUser {
  id: string;
  email: string;
  username: string;
  plan: string;
  token: string;
  noteIds: string[];
  bigNoteId: string;
  publishedIds: string[];
}

async function chunkedCreate<T>(rows: T[], create: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += CREATE_CHUNK) {
    await create(rows.slice(i, i + CREATE_CHUNK));
  }
}

async function main() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set — run inside the backend container');

  console.error(`Seeding ${USERS} users × ${NOTES_PER_USER} notes (+${POWER_NOTES} power notes)…`);

  const removed = await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
  if (removed.count > 0) console.error(`Removed ${removed.count} previous load-test user(s)`);

  // One hash for all users: the fixture password is shared and hashing is slow.
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const users: SeedUser[] = [];
  for (let i = 0; i < USERS; i++) {
    const id = randomUUID();
    users.push({
      id,
      email: `u${i}@${DOMAIN}`,
      username: `loadtester${i}`,
      plan: i < WRITER_USERS ? 'writer' : 'free',
      token: jwt.sign({ userId: id }, secret, { expiresIn: '7d' }),
      noteIds: [],
      bigNoteId: '',
      publishedIds: [],
    });
  }
  await prisma.user.createMany({
    data: users.map((u, i) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      name: `Load Tester ${i}`,
      password: passwordHash,
      plan: u.plan,
      isVerified: true,
    })),
  });
  console.error('Users created');

  // Notes: per-user mix of small notes plus two big ones; user 0 gets the
  // power corpus on top.
  type NoteRow = {
    id: string; title: string; content: string; userId: string; createdAt: Date;
  };
  const noteRows: NoteRow[] = [];
  for (const [i, u] of users.entries()) {
    const count = NOTES_PER_USER + (i === 0 ? POWER_NOTES : 0);
    for (let j = 0; j < count; j++) {
      const id = randomUUID();
      const big = j === 0 || j === 1;
      if (big) u.bigNoteId = id;
      if (u.noteIds.length < 25) u.noteIds.push(id);
      noteRows.push({
        id,
        title: `${pick(WORDS)} ${pick(WORDS)} ${j}`,
        content: noteHtml(big ? 120_000 : 2_000 + Math.floor(Math.random() * 8_000)),
        userId: u.id,
        createdAt: daysAgo(Math.random() * 90),
      });
    }
  }
  await chunkedCreate(noteRows, (chunk) => prisma.note.createMany({ data: chunk }));
  console.error(`${noteRows.length} notes created`);

  // Bookmarks + attachments to notes (name is unique per user, not globally).
  const bookmarkRows = users.flatMap((u) =>
    Array.from({ length: BOOKMARKS_PER_USER }, (_, b) => ({
      id: randomUUID(),
      name: `${pick(WORDS)}-${b}`,
      userId: u.id,
    })),
  );
  await prisma.bookmark.createMany({ data: bookmarkRows });
  const noteBookmarkRows = users.flatMap((u) => {
    const own = bookmarkRows.filter((b) => b.userId === u.id);
    return u.noteIds.slice(0, 12).map((noteId) => ({ noteId, bookmarkId: pick(own).id }));
  });
  await prisma.noteBookmark.createMany({ data: noteBookmarkRows, skipDuplicates: true });
  console.error('Bookmarks created');

  // Collaborations: the hot doc (user 0's first note) is shared with everyone —
  // the WS flood needs many distinct users with access to one document. Each
  // other user additionally shares one note with their neighbour.
  const hotDocId = users[0].noteIds[0];
  const collabRows = users.slice(1).map((u) => ({
    noteId: hotDocId,
    userId: u.id,
    status: 'accepted',
    acceptedAt: new Date(),
  }));
  for (let i = 1; i < users.length; i++) {
    collabRows.push({
      noteId: users[i].noteIds[0],
      userId: users[(i + 1) % users.length].id,
      status: 'accepted',
      acceptedAt: new Date(),
    });
  }
  await prisma.noteCollaborator.createMany({ data: collabRows, skipDuplicates: true });
  console.error('Collaborations created');

  // Publications: snapshot the note content like the real publish flow does.
  type PubRow = {
    id: string; noteId: string; ownerId: string; title: string; content: string;
    description: string; tags: string[]; topics: string[]; readingTime: number;
    publishedAt: Date;
  };
  const pubRows: PubRow[] = [];
  for (const u of users) {
    for (const noteId of u.noteIds.slice(2, 2 + PUBLISHED_PER_USER)) {
      const note = noteRows.find((n) => n.id === noteId)!;
      const id = randomUUID();
      u.publishedIds.push(id);
      pubRows.push({
        id,
        noteId,
        ownerId: u.id,
        title: note.title,
        content: note.content,
        description: sentence(),
        tags: sample(WORDS, 3),
        topics: sample(TOPICS, 2),
        readingTime: Math.max(1, Math.round(note.content.split(' ').length / 200)),
        publishedAt: daysAgo(Math.random() * 30),
      });
    }
  }
  await chunkedCreate(pubRows, (chunk) => prisma.publishedNote.createMany({ data: chunk }));
  console.error(`${pubRows.length} publications created`);

  // Likes: backdated so roughly half land inside the 7-day trending window.
  const likeRows: { userId: string; publishedNoteId: string; createdAt: Date }[] = [];
  const allPubIds = pubRows.map((p) => p.id);
  for (const u of users) {
    for (const pubId of sample(allPubIds, LIKES_PER_USER)) {
      likeRows.push({ userId: u.id, publishedNoteId: pubId, createdAt: daysAgo(Math.random() * 14) });
    }
  }
  await chunkedCreate(likeRows, (chunk) =>
    prisma.publishedNoteLike.createMany({ data: chunk, skipDuplicates: true }),
  );
  // likeCount is denormalized; recompute it from the rows we just created.
  await prisma.$executeRaw`
    UPDATE published_notes SET "likeCount" =
      (SELECT COUNT(*) FROM published_note_likes l WHERE l."publishedNoteId" = published_notes.id)`;
  console.error(`${likeRows.length} likes created`);

  const followRows = users.flatMap((u) =>
    sample(users.filter((o) => o.id !== u.id), FOLLOWS_PER_USER).map((o) => ({
      followerId: u.id,
      followingId: o.id,
    })),
  );
  await prisma.follow.createMany({ data: followRows, skipDuplicates: true });
  console.error('Follows created');

  const fixture = {
    generatedAt: new Date().toISOString(),
    password: PASSWORD,
    searchTerms: WORDS,
    hotDocId,
    allPublishedIds: sample(allPubIds, Math.min(100, allPubIds.length)),
    users,
  };
  writeFileSync('loadtest-seed.json', JSON.stringify(fixture, null, 2));
  console.error('Fixture written to loadtest-seed.json');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
