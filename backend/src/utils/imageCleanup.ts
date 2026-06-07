import fs from 'fs';
import path from 'path';

const uploadsDir = path.join(process.cwd(), 'uploads');

export function extractUploadUrls(content: string): string[] {
  if (!content) return [];
  const matches = content.match(/\/uploads\/[^\s"'<>]+/g);
  return matches ? [...new Set(matches)] : [];
}

export function deleteFiles(urls: string[]): void {
  for (const url of urls) {
    const filename = url.replace('/uploads/', '');
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`Fehler beim Löschen von ${filePath}:`, err);
      }
    }
  }
}
