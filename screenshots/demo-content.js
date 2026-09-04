// The writing that appears in the README screenshots. Kept apart from seed.js
// so the prose can be edited without touching the Prisma logic.
//
// Note.content is plain HTML with the editor's own class names, not Lexical
// JSON — which is why these can be written by hand.

// ─── HTML helpers ───────────────────────────────────────────────────────────

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const span = (t) => `<span style="white-space: pre-wrap;">${esc(t)}</span>`;
const p = (t) => `<p class="editor-paragraph">${t ? span(t) : '<br>'}</p>`;
const h = (n, t) => `<h${n} class="editor-heading-h${n}">${span(t)}</h${n}>`;
const quote = (t) => `<blockquote class="editor-quote">${span(t)}</blockquote>`;
const hr = '<hr>';

const ul = (items) =>
  `<ul class="editor-list-ul">${items
    .map((t, i) => `<li value="${i + 1}" class="editor-listitem">${span(t)}</li>`)
    .join('')}</ul>`;

const check = (items) =>
  `<ul class="editor-list-ul" __lexicallisttype="check">${items
    .map(
      ([t, done], i) =>
        `<li role="checkbox" tabindex="-1" aria-checked="${done}" value="${i + 1}" ` +
        `class="editor-listitem editor-listitem-${done ? 'checked' : 'unchecked'}">${span(t)}</li>`
    )
    .join('')}</ul>`;

// ─── The demo owner's workspace ─────────────────────────────────────────────

// Spaces and bookmarks are referenced by number from NOTES below. Bookmark
// names double as the theme nodes drawn in the Arbor.
const SPACES = [
  { n: 1, name: 'Essays', cover: '/img/presets/stone.webp' },
  { n: 2, name: 'Journal', cover: '/img/presets/linen.webp' },
  { n: 3, name: 'Reading', cover: '/img/presets/book.webp' },
];

const BOOKMARKS = [
  { n: 1, name: 'Essays', color: '#b08d57' },
  { n: 2, name: 'Attention', color: '#7b8f7b' },
  { n: 3, name: 'Journal', color: '#8c7a6b' },
  { n: 4, name: 'Reading', color: '#6b7f8c' },
];

// demo-note-1 is the one the editor screenshot opens, so it carries the most
// formatting: heading, quote and a list.
const NOTES = [
  {
    n: 1,
    title: 'On Things That Endure',
    cover: '/img/presets/stone.webp',
    bookmarks: [1, 2],
    space: 1,
    days: 0,
    body: [
      p('There is a particular kind of writing that survives its own occasion.'),
      p(''),
      p(
        'Most of what we put down is weather. It records a mood, answers a question already forgotten, and dissolves. But every so often a page keeps its temperature. You return to it years later and it still holds.'
      ),
      p(''),
      quote('What endures is not what was written well, but what was written honestly.'),
      p(''),
      h(2, 'Three habits'),
      ul([
        'Write the sentence you are avoiding first.',
        'Keep the fragment. It is often the only living part.',
        'Reread before adding. Most drafts want subtraction.',
      ]),
      p(''),
      p(
        'The notebook is not an archive. It is a room you keep returning to, and the returning is the point.'
      ),
    ].join(''),
  },
  {
    n: 2,
    title: 'Field Notes, Kyoto',
    cover: '/img/presets/sand-wall.webp',
    bookmarks: [3],
    space: 2,
    days: 2,
    body: [
      p('Rain since morning. The gravel garden reads differently wet than dry.'),
      p(''),
      h(2, 'Ryoan-ji, late afternoon'),
      p(
        'Fifteen stones, and from no single position can all fifteen be seen at once. The incompleteness is deliberate. You are meant to notice that you are standing somewhere.'
      ),
      p(''),
      quote('A garden that can be fully seen has stopped asking anything of you.'),
      p(''),
      p('Bought paper near Nishiki. Heavier than it looked. It takes ink slowly.'),
    ].join(''),
  },
  {
    n: 3,
    title: 'Reading Journal',
    cover: '/img/presets/book.webp',
    bookmarks: [2, 4],
    space: 3,
    days: 4,
    body: [
      h(2, 'Berger, Ways of Seeing'),
      p(
        'The argument that images are never neutral holds up better than the book around it. Reread chapter one, skim the rest.'
      ),
      p(''),
      quote('We only see what we look at. To look is an act of choice.'),
      p(''),
      h(2, 'Dillard, Pilgrim at Tinker Creek'),
      p(
        'Sentences that move faster than the eye expects. She keeps changing the scale without warning: creek, cell, cosmos, back to creek.'
      ),
    ].join(''),
  },
  {
    n: 4,
    title: 'The Quiet Hours',
    cover: '/img/presets/linen.webp',
    bookmarks: [1],
    space: 1,
    days: 6,
    body: [
      p(
        'Between five and seven the house makes no demands. Everything written here was written then.'
      ),
      p(''),
      p(
        'It is not that the early hours are more creative. They are simply unclaimed. Nobody has asked anything of them yet.'
      ),
    ].join(''),
  },
  {
    n: 5,
    title: 'A Grammar of Attention',
    cover: '/img/presets/white-stone.webp',
    bookmarks: [2],
    space: 3,
    days: 9,
    body: [
      p('Notes toward an essay. Not ready.'),
      p(''),
      p(
        'Attention has a grammar: it has tense, it has mood, it can be active or passive. Most advice about focus treats it as a quantity. It behaves far more like a syntax.'
      ),
      p(''),
      h(3, 'Open questions'),
      ul([
        'Is distraction a failure of attention or a different conjugation of it?',
        'Where does noticing end and thinking begin?',
      ]),
    ].join(''),
  },
  {
    n: 6,
    title: 'Winter Reading List',
    cover: '/img/presets/walnut-wood.webp',
    bookmarks: [4],
    space: 3,
    days: 12,
    body: [
      p('Short enough to finish, slow enough to matter.'),
      p(''),
      check([
        ['Berger, Ways of Seeing', 'true'],
        ['Dillard, Pilgrim at Tinker Creek', 'true'],
        ['Bachelard, The Poetics of Space', 'false'],
        ['Weil, Gravity and Grace', 'false'],
      ]),
    ].join(''),
  },
  {
    n: 7,
    title: 'Letters, Unsent',
    cover: '/img/presets/clay.webp',
    bookmarks: [1],
    space: 1,
    days: 16,
    body: [
      p('Some of these were never meant to arrive. Writing them was the whole errand.'),
      p(''),
      hr,
      p('Kept because the third paragraph is true, even if the rest is not.'),
    ].join(''),
  },
  {
    n: 8,
    title: 'Morning Pages',
    cover: '/img/presets/handmade-paper.webp',
    bookmarks: [3],
    space: 2,
    days: 21,
    body: [
      p('Unedited, on purpose. The only rule is that the pen keeps moving.'),
      p(''),
      p('Today: the difference between having an idea and being willing to sit with it.'),
    ].join(''),
  },
];

// ─── Explore ────────────────────────────────────────────────────────────────

const AUTHORS = [
  { n: 2, name: 'Mira Adelsson', username: 'mira' },
  { n: 3, name: 'Tomas Reinhardt', username: 'tomas' },
  { n: 4, name: 'Junia Okonkwo', username: 'junia' },
];

// Explore's Featured row sorts by likeCount. These counts sit far above the
// load-test fixtures (8-9 likes), which is what pushes that noise out of frame
// without deleting anything.
const PUBLISHED = [
  {
    n: 1,
    author: 2,
    title: 'The Case for Slower Notes',
    description:
      'Faster capture has made us worse at keeping. An argument for writing less down, and returning to it more often.',
    topics: ['Philosophy', 'Productivity'],
    tags: ['writing', 'attention', 'craft'],
    cover: '/img/presets/handmade-paper.webp',
    likes: 412,
    reading: 6,
    views: 3180,
    days: 3,
  },
  {
    n: 2,
    author: 3,
    title: 'Rooms I Have Written In',
    description:
      'A short catalogue of desks, borrowed kitchens and one train compartment, and what each of them did to the sentences.',
    topics: ['Design'],
    tags: ['essay', 'places', 'process'],
    cover: '/img/presets/wood.webp',
    likes: 287,
    reading: 4,
    views: 2044,
    days: 6,
  },
  {
    n: 3,
    author: 4,
    title: 'Notes on Rereading',
    description:
      'The second pass is where the thinking happens. On marginalia, forgetting well, and why first drafts of attention are unreliable.',
    topics: ['Learning', 'Philosophy'],
    tags: ['reading', 'memory'],
    cover: '/img/presets/book.webp',
    likes: 264,
    reading: 5,
    views: 1897,
    days: 9,
  },
  {
    n: 4,
    author: 2,
    title: 'A Field Guide to Unfinished Work',
    description:
      'Most notebooks are graveyards of good beginnings. A taxonomy of the ways a piece stalls, and which stalls are worth respecting.',
    topics: ['Productivity'],
    tags: ['drafts', 'craft'],
    cover: '/img/presets/clay-2.webp',
    likes: 231,
    reading: 7,
    views: 1620,
    days: 12,
  },
  {
    n: 5,
    author: 3,
    title: 'What the Margin Knows',
    description:
      'Marginalia as a form of thinking in public with yourself. On books that became conversations.',
    topics: ['Philosophy', 'Learning'],
    tags: ['reading', 'annotation'],
    cover: '/img/presets/flower-1.webp',
    likes: 198,
    reading: 4,
    views: 1355,
    days: 15,
  },
  {
    n: 6,
    author: 4,
    title: 'On Keeping a Commonplace Book',
    description:
      'The oldest personal knowledge system is four hundred years old and still better designed than most of what replaced it.',
    topics: ['Learning'],
    tags: ['history', 'notes', 'method'],
    cover: '/img/presets/sand-wall.webp',
    likes: 176,
    reading: 8,
    views: 1204,
    days: 19,
  },
];

// Explore only ever shows the card, so one shared excerpt is enough body text.
const publishedBody = (title) =>
  [
    p('An excerpt.'),
    p(''),
    p(
      'The habit is older than the tools we use for it. Before the file and the folder there was the notebook, and before the notebook the wax tablet, scraped flat and used again.'
    ),
    p(''),
    quote('Every system for keeping thoughts is a theory about which ones deserve to be kept.'),
    p(''),
    p(`Continued in ${title}.`),
  ].join('');

module.exports = { SPACES, BOOKMARKS, NOTES, AUTHORS, PUBLISHED, publishedBody };
