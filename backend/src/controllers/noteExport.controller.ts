import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const exportNoteToPdf = async (req: AuthRequest, res: Response) => {
  try {
    const [note, user] = await Promise.all([
      prisma.note.findFirst({ where: { id: req.params.id as string, userId: req.userId! } }),
      prisma.user.findUnique({ where: { id: req.userId! }, select: { plan: true } }),
    ]);

    if (!note) return res.status(404).json({ error: 'Note not found' });

    const plan = (user?.plan || 'free').toLowerCase();
    if (plan !== 'writer' && plan !== 'author') {
      return res.status(403).json({ error: 'Writer plan required' });
    }

    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    const safeTitle = (note.title || 'Note').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>${safeTitle}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 2rem; line-height: 1.6; color: #111; }
  img { max-width: 100%; }
  h1 { font-size: 2rem; margin-bottom: 1rem; }
  pre { background: #f3f4f6; padding: 1rem; border-radius: 4px; overflow-x: auto; font-size: 0.875rem; }
  code { font-family: monospace; font-size: 0.875em; background: #f3f4f6; padding: 0.1em 0.3em; border-radius: 3px; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
  th, td { border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; text-align: left; }
  th { background: #f9fafb; font-weight: 600; }
  blockquote { border-left: 3px solid #d1d5db; margin: 1rem 0; padding: 0 1rem; color: #6b7280; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
</style>
</head>
<body>
<h1>${safeTitle}</h1>
${note.content || ''}
</body>
</html>`;

    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' },
      printBackground: true,
    });
    await browser.close();

    const filename = encodeURIComponent(note.title || 'Note') + '.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    return res.send(Buffer.from(pdf));
  } catch (error) {
    console.error('exportNoteToPdf error:', error);
    return res.status(500).json({ error: 'PDF-Generierung fehlgeschlagen' });
  }
};
