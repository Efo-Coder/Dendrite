// Renders the README screenshots from the locally running app and writes them
// to docs/screenshots/. Logs in by injecting a JWT into localStorage and picks
// the view through sessionStorage['dendrite:nav'] — the dashboard views are
// component state, not routes, so there is no URL to navigate to.
//
//   TOKEN=<jwt> node shoot.js
//   TOKEN=<jwt> ONLY=editor,arbor THEME=dark node shoot.js
//
const { chromium } = require('playwright');

// ─── Configuration ──────────────────────────────────────────────────────────

const BASE = process.env.BASE || 'http://localhost:5173';
const TOKEN = process.env.TOKEN;
const NOTE = process.env.NOTE || 'demo-note-1';
const OUT = process.env.OUT || '../docs/screenshots';
const THEME = process.env.THEME || 'light';
const SCALE = Number(process.env.SCALE || 2);
const QUALITY = Number(process.env.QUALITY || 88);
// PNG at 2x runs to megabytes per shot because of the cover photos.
const FORMAT = process.env.FORMAT || 'jpeg';
const VIEWPORT = { width: 1440, height: 900 };

// The settings store's persist version. If the store is migrated past this,
// zustand discards the injected state and the shots come back in the default
// theme — bump it to match store/useSettingsStore.ts.
const SETTINGS_VERSION = 8;

// Each view fades its cards in on mount; screenshotting too early catches them
// half transparent. The Arbor also has to lay out its branches first.
const SHOTS = [
  { name: 'landing', view: null, auth: false, wait: 6000 },
  { name: 'home', view: 'home', auth: true, wait: 5000 },
  { name: 'editor', view: 'home', auth: true, wait: 6000, note: true },
  { name: 'spaces', view: 'spaces', auth: true, wait: 5000 },
  { name: 'library', view: 'library', auth: true, wait: 5000 },
  { name: 'explore', view: 'explore', auth: true, wait: 5500 },
  { name: 'arbor', view: 'constellations', auth: true, wait: 12000 },
  { name: 'reflection', view: 'reflection', auth: true, wait: 5000 },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const navState = (appView, openNoteId) => ({
  appView,
  category: 'all',
  stack: [],
  containerReturn: 'home',
  profileUserId: null,
  openNoteId: openNoteId ?? null,
});

// Runs in the page before any app code: authenticates, silences the consent
// banner and pins the theme.
function prepareStorage({ token, view, auth, theme, version }) {
  try {
    if (auth) localStorage.setItem('token', token);
    // Otherwise the consent banner sits in the middle of every shot.
    localStorage.setItem('dendrite-cookie-consent', 'acknowledged');
    // Theme and activeLine live in the zustand-persisted settings store, not in
    // keys of their own. activeLine off: the caret's line highlight would
    // otherwise leave a grey band across whichever paragraph the editor focuses.
    localStorage.setItem(
      'dendrite-settings',
      JSON.stringify({ state: { themeMode: theme, activeLine: false }, version })
    );
    if (view) sessionStorage.setItem('dendrite:nav', JSON.stringify(view));
  } catch {
    /* storage blocked — the shot will just show the signed-out state */
  }
}

async function capture(browser, shot) {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    colorScheme: THEME === 'dark' ? 'dark' : 'light',
  });
  await ctx.addInitScript(prepareStorage, {
    token: TOKEN,
    view: shot.view ? navState(shot.view, shot.note ? NOTE : null) : null,
    auth: shot.auth,
    theme: THEME,
    version: SETTINGS_VERSION,
  });

  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  try {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 });
  } catch {
    // networkidle never settles while the collab socket is open — the fixed
    // wait below is what actually decides whether the view is painted.
  }
  await page.waitForTimeout(shot.wait);

  const jpeg = FORMAT === 'jpeg';
  const file = `${OUT}/${shot.name}.${jpeg ? 'jpg' : 'png'}`;
  await page.screenshot(jpeg ? { path: file, type: 'jpeg', quality: QUALITY } : { path: file });
  await ctx.close();

  return { file, errors };
}

// ─── Run ────────────────────────────────────────────────────────────────────

(async () => {
  if (!TOKEN) throw new Error('TOKEN env var required — see README.md');

  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  const browser = await chromium.launch();

  for (const shot of SHOTS) {
    if (only && !only.includes(shot.name)) continue;
    const { file, errors } = await capture(browser, shot);
    const failed = errors.length ? `  JS-ERRORS: ${errors.slice(0, 2).join(' | ')}` : '';
    console.log(`${shot.name.padEnd(12)} -> ${file}${failed}`);
  }

  await browser.close();
  console.log('done');
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
