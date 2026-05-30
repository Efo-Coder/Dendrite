import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const uploadsDir = path.join(__dirname, '../../uploads');

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
