// Seeds the demo account behind the README screenshots and prints a login
// token for shoot.js. Runs INSIDE the backend container, which is where
// JWT_SECRET and the Prisma client live. Both files have to be copied in —
// piping this one through stdin would leave the require() below unresolved:
//
//   docker cp seed.js dendrite-backend:/tmp/seed.js
//   docker cp demo-content.js dendrite-backend:/tmp/demo-content.js
//   docker exec -e NODE_PATH=/app/node_modules dendrite-backend node /tmp/seed.js
//
// NODE_PATH is required because /tmp is outside the app directory, so node
// would not find the backend's node_modules on its own.
//
// Additive and idempotent. Every row it writes carries a "demo-" id, so it
// never touches real data and can be removed again with a prefix match.
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const {
  SPACES,
  BOOKMARKS,
  NOTES,
  AUTHORS,
  PUBLISHED,
  publishedBody,
} = require('./demo-content');

const prisma = new PrismaClient();

// ─── Constants ──────────────────────────────────────────────────────────────

const OWNER_EMAIL = 'demo@dendrite.local';
const OWNER_NAME = 'Efrahim';

const UID = (n) => `demo-user-${n}`;
const NID = (n) => `demo-note-${n}`;
const SID = (n) => `demo-space-${n}`;
const BID = (n) => `demo-bookmark-${n}`;
const PID = (n) => `demo-pub-${n}`;

// Published notes need a backing note row; offset keeps them clear of the
// owner's own note ids.
const PUB_NOTE_OFFSET = 100;

const daysAgo = (d) => new Date(Date.now() - d * 86400000);

// ─── Seed steps ─────────────────────────────────────────────────────────────

async function seedOwner() {
  return prisma.user.upsert({
    where: { id: UID(1) },
    update: {},
    create: {
      id: UID(1),
      email: OWNER_EMAIL,
      name: OWNER_NAME,
      username: 'efrahim-demo',
      isVerified: true,
      plan: 'author',
      bio: 'Notes on writing, attention and the things worth keeping.',
    },
  });
}

async function seedWorkspace(ownerId) {
  for (const s of SPACES) {
    await prisma.space.upsert({
      where: { id: SID(s.n) },
      update: { name: s.name, coverImage: s.cover },
      create: { id: SID(s.n), name: s.name, coverImage: s.cover, userId: ownerId, order: s.n },
    });
  }

  for (const b of BOOKMARKS) {
    await prisma.bookmark.upsert({
      where: { id: BID(b.n) },
      update: { name: b.name, color: b.color },
      create: { id: BID(b.n), name: b.name, color: b.color, userId: ownerId },
    });
  }

  for (const note of NOTES) {
    const when = daysAgo(note.days);
    await prisma.note.upsert({
      where: { id: NID(note.n) },
      update: {
        title: note.title,
        content: note.body,
        coverImage: note.cover,
        spaceId: SID(note.space),
        updatedAt: when,
      },
      create: {
        id: NID(note.n),
        title: note.title,
        content: note.body,
        coverImage: note.cover,
        userId: ownerId,
        spaceId: SID(note.space),
        order: note.n,
        createdAt: when,
        updatedAt: when,
      },
    });

    for (const b of note.bookmarks) {
      await prisma.noteBookmark.upsert({
        where: { noteId_bookmarkId: { noteId: NID(note.n), bookmarkId: BID(b) } },
        update: {},
        create: { noteId: NID(note.n), bookmarkId: BID(b) },
      });
    }
  }
}

async function seedExplore() {
  for (const a of AUTHORS) {
    await prisma.user.upsert({
      where: { id: UID(a.n) },
      update: {},
      create: {
        id: UID(a.n),
        email: `${a.username}@dendrite.local`,
        name: a.name,
        username: a.username,
        isVerified: true,
      },
    });
  }

  for (const pub of PUBLISHED) {
    const noteId = NID(PUB_NOTE_OFFSET + pub.n);
    const when = daysAgo(pub.days);
    const body = publishedBody(pub.title);

    await prisma.note.upsert({
      where: { id: noteId },
      update: { title: pub.title, content: body },
      create: {
        id: noteId,
        title: pub.title,
        content: body,
        coverImage: pub.cover,
        userId: UID(pub.author),
        createdAt: when,
        updatedAt: when,
      },
    });

    await prisma.publishedNote.upsert({
      where: { id: PID(pub.n) },
      update: {
        title: pub.title,
        description: pub.description,
        likeCount: pub.likes,
        viewCount: pub.views,
      },
      create: {
        id: PID(pub.n),
        noteId,
        ownerId: UID(pub.author),
        title: pub.title,
        description: pub.description,
        content: body,
        coverImage: pub.cover,
        tags: pub.tags,
        topics: pub.topics,
        readingTime: pub.reading,
        likeCount: pub.likes,
        viewCount: pub.views,
        publishedAt: when,
      },
    });
  }
}

// ─── Run ────────────────────────────────────────────────────────────────────

(async () => {
  const owner = await seedOwner();
  await seedWorkspace(owner.id);
  await seedExplore();

  console.log(
    JSON.stringify(
      {
        notes: NOTES.length,
        spaces: SPACES.length,
        bookmarks: BOOKMARKS.length,
        published: PUBLISHED.length,
        editorNoteId: NID(1),
        token: jwt.sign({ userId: owner.id }, process.env.JWT_SECRET, { expiresIn: '2h' }),
      },
      null,
      2
    )
  );
  await prisma.$disconnect();
})().catch((e) => {
  console.error('SEED FAILED:', e.message);
  process.exit(1);
});
