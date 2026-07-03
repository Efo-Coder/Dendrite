// Drives one real user session in headless Chromium while k6 load runs:
// opens a seeded note via token injection (verifier-browser technique), types
// into the editor so real autosaves fire, then wanders through the app.
// Everything suspicious is collected and printed as a JSON report at the end —
// console errors, page crashes, failed HTTP responses, WebSocket drops.
//
//   USER_INDEX=3 DURATION_MS=120000 node journey.js
//
// Requires playwright in the working directory (see loadtest/README.md) and a
// fresh fixture from backend/scripts/loadtest-seed.ts.

const { chromium } = require('playwright');
const path = require('path');

const BASE = process.env.BASE || 'http://localhost:5173';
const SEED_FILE = process.env.SEED_FILE || path.resolve(__dirname, '../../backend/loadtest-seed.json');
// Not `USER` — that collides with the POSIX username variable in Git Bash.
const USER_INDEX = parseInt(process.env.USER_INDEX || '0', 10);
const DURATION_MS = parseInt(process.env.DURATION_MS || '120000', 10);

const SEED = require(SEED_FILE);
const user = SEED.users[USER_INDEX % SEED.users.length];

const findings = [];
function note(kind, detail) {
  findings.push({ kind, detail, at: new Date().toISOString() });
  console.log(`[${kind}] ${detail}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  page.on('pageerror', (e) => note('pageerror', e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') note('console-error', m.text().slice(0, 300));
  });
  page.on('response', (r) => {
    if (r.status() >= 400) note('http-' + r.status(), `${r.request().method()} ${r.url()}`);
  });
  page.on('requestfailed', (r) => {
    // Aborted requests are normal SPA behavior (navigation cancels fetches).
    const reason = r.failure()?.errorText ?? '';
    if (!reason.includes('ERR_ABORTED')) note('request-failed', `${r.url()} ${reason}`);
  });
  page.on('websocket', (ws) => {
    ws.on('socketerror', (e) => note('ws-error', String(e).slice(0, 200)));
  });

  const noteId = user.noteIds[USER_INDEX % user.noteIds.length];
  const navState = JSON.stringify({
    appView: 'home', category: 'all', stack: [],
    containerReturn: 'home', profileUserId: null, openNoteId: noteId,
  });
  await page.addInitScript(([t, nav]) => {
    localStorage.setItem('token', t);
    sessionStorage.setItem('dendrite:nav', nav);
  }, [user.token, navState]);

  const deadline = Date.now() + DURATION_MS;
  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[contenteditable="true"]', { timeout: 30000 });

    // Typing loop: short bursts with pauses, like a human writing — each pause
    // lets the app autosave, so the write path runs against the k6 load.
    let round = 0;
    while (Date.now() < deadline) {
      round++;
      const editor = page.locator('[contenteditable="true"]').first();
      await editor.click({ timeout: 10000 });
      await page.keyboard.press('Control+End').catch(() => {});
      await page.keyboard.type(` Session ${USER_INDEX} round ${round}: thoughts under load.`, { delay: 20 });
      await page.waitForTimeout(2500);
    }

    await page.screenshot({ path: `journey-${USER_INDEX}-final.png` });
  } catch (e) {
    note('journey-error', e.message);
    await page.screenshot({ path: `journey-${USER_INDEX}-error.png` }).catch(() => {});
  } finally {
    await browser.close();
    console.log('--- REPORT ---');
    console.log(JSON.stringify({ user: user.email, noteId, findings }, null, 2));
    process.exit(findings.some((f) => f.kind === 'pageerror' || f.kind.startsWith('http-5')) ? 1 : 0);
  }
})();
