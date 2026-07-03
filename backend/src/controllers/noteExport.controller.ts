import { Response } from 'express';
import type { Browser } from 'puppeteer';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Appearance flags the /print route understands. Whitelisted so we never forward
// arbitrary query input into the navigated URL.
const PDF_PARAMS = ['theme', 'palette', 'font', 'fontSize', 'density'] as const;

// Chromium is the most expensive resource in the app (~200 MB, 1–2 s startup),
// so exports share one long-lived browser and only rendering runs per request,
// gated to a small concurrency with a bounded queue. Beyond that the endpoint
// sheds load with 429 instead of letting parallel exports take the server down.
const MAX_CONCURRENT_RENDERS = 2;
const MAX_QUEUED_RENDERS = 8;

// ─── Shared browser ──────────────────────────────────────────────────────────

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    const existing = await browserPromise.catch(() => null);
    if (existing && existing.connected) return existing;
  }
  browserPromise = (async () => {
    const puppeteer = await import('puppeteer');
    return puppeteer.default.launch({
      headless: true,
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  })();
  return browserPromise;
}

// ─── Render gate ─────────────────────────────────────────────────────────────

let active = 0;
const waiting: (() => void)[] = [];

function waitForSlot(): Promise<void> {
  if (active < MAX_CONCURRENT_RENDERS) {
    active++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waiting.push(() => {
      active++;
      resolve();
    });
  });
}

function releaseSlot(): void {
  active--;
  waiting.shift()?.();
}

// ─── Handler ─────────────────────────────────────────────────────────────────

// Renders the note's real editor view to PDF: Puppeteer loads the SPA's /print route
// (identical CSS + webfonts as the live editor), authenticated via the caller's token,
// and prints it. This is the only way the export matches the editor 1:1 — there is no
// second, hand-maintained stylesheet to drift.
export const exportNoteToPdf = async (req: AuthRequest, res: Response) => {
  let holdsSlot = false;
  try {
    const [note, user] = await Promise.all([
      prisma.note.findFirst({
        where: { id: req.params.id as string, userId: req.userId! },
        select: { id: true, title: true, content: true },
      }),
      prisma.user.findUnique({ where: { id: req.userId! }, select: { plan: true } }),
    ]);

    if (!note) return res.status(404).json({ error: 'Note not found' });

    const plan = (user?.plan || 'free').toLowerCase();
    if (plan !== 'writer' && plan !== 'author') {
      return res.status(403).json({ error: 'Writer plan required' });
    }

    if (active >= MAX_CONCURRENT_RENDERS && waiting.length >= MAX_QUEUED_RENDERS) {
      return res.status(429).json({ error: 'Export ist gerade ausgelastet — bitte kurz erneut versuchen' });
    }
    await waitForSlot();
    holdsSlot = true;

    const params = new URLSearchParams();
    for (const key of PDF_PARAMS) {
      const value = req.query[key];
      if (typeof value === 'string') params.append(key, value);
    }
    const target = `${FRONTEND_URL}/print/${note.id}?${params.toString()}`;

    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      // A4 at 96dpi (794×1123px) so the layout matches the printed page.
      await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

      // Inject the note directly — we already loaded it as the authenticated owner — so
      // the print page renders with no API call (no cross-origin/CORS, no auth roundtrip).
      await page.evaluateOnNewDocument(
        (data: { title: string; content: string }) => {
          (globalThis as unknown as { __PRINT_NOTE__: typeof data }).__PRINT_NOTE__ = data;
        },
        { title: note.title ?? '', content: note.content ?? '' },
      );

      // Render with screen styles — the app has no separate print stylesheet; /print
      // exposes its own html[data-print] overrides for page flow instead.
      await page.emulateMediaType('screen');
      await page.goto(target, { waitUntil: 'networkidle0', timeout: 30000 });
      // The print page sets this only after content is mounted and webfonts are ready.
      await page.waitForSelector('html[data-print-ready="true"]', { timeout: 20000 });

      // No @page margin — the colored page background must fill the whole sheet; the
      // text inset comes from the print CSS padding (html[data-print] .editor-canvas).
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });

      const filename = encodeURIComponent(note.title || 'Note') + '.pdf';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
      return res.send(Buffer.from(pdf));
    } finally {
      await page.close().catch(() => {});
    }
  } catch (error) {
    console.error('exportNoteToPdf error:', error);
    return res.status(500).json({ error: 'PDF-Generierung fehlgeschlagen' });
  } finally {
    if (holdsSlot) releaseSlot();
  }
};

process.on('SIGTERM', () => {
  browserPromise?.then((b) => b.close()).catch(() => {});
});
