import { Response } from 'express';
import type { Browser } from 'puppeteer';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Appearance flags the /print route understands. Whitelisted so we never forward
// arbitrary query input into the navigated URL.
const PDF_PARAMS = ['theme', 'palette', 'font', 'fontSize', 'density'] as const;

// Renders the note's real editor view to PDF: Puppeteer loads the SPA's /print route
// (identical CSS + webfonts as the live editor), authenticated via the caller's token,
// and prints it. This is the only way the export matches the editor 1:1 — there is no
// second, hand-maintained stylesheet to drift.
export const exportNoteToPdf = async (req: AuthRequest, res: Response) => {
  let browser: Browser | undefined;
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

    const params = new URLSearchParams();
    for (const key of PDF_PARAMS) {
      const value = req.query[key];
      if (typeof value === 'string') params.append(key, value);
    }
    const target = `${FRONTEND_URL}/print/${note.id}?${params.toString()}`;

    const puppeteer = await import('puppeteer');
    browser = await puppeteer.default.launch({
      headless: true,
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
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
    await browser.close();
    browser = undefined;

    const filename = encodeURIComponent(note.title || 'Note') + '.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    return res.send(Buffer.from(pdf));
  } catch (error) {
    console.error('exportNoteToPdf error:', error);
    if (browser) await browser.close().catch(() => {});
    return res.status(500).json({ error: 'PDF-Generierung fehlgeschlagen' });
  }
};
