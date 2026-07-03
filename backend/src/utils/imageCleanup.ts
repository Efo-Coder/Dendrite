import fs from 'fs/promises';
import path from 'path';

const uploadsDir = path.join(process.cwd(), 'uploads');

export function extractUploadUrls(content: string): string[] {
  if (!content) return [];
  const matches = content.match(/\/uploads\/[^\s"'<>]+/g);
  return matches ? [...new Set(matches)] : [];
}

// Best-effort background deletion: callers never wait on disk IO (sync unlink
// on the request path blocks the event loop), and an already-missing file is
// success, not an error.
export function deleteFiles(urls: string[]): void {
  for (const url of urls) {
    const filename = url.replace('/uploads/', '');
    // Note content is user input — never let a crafted ../ path escape uploads/.
    const filePath = path.resolve(uploadsDir, filename);
    if (!filePath.startsWith(uploadsDir + path.sep)) continue;
    fs.unlink(filePath).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== 'ENOENT') console.error(`Fehler beim Löschen von ${filePath}:`, err);
    });
  }
}
