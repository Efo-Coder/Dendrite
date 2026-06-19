import { Note } from '../../types';

// Month bucket label of a note, e.g. "JUN 2026".
export const monthKeyOf = (n: Note) =>
  new Date(n.updatedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }).toUpperCase();

export const stripHtml = (html: string) => {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;

  tmp.querySelectorAll('img').forEach((img) => {
    const alignment = img.getAttribute('data-alignment');
    if (alignment === 'left' || alignment === 'right') {
      img.remove();
    } else {
      const nextText = (img.nextElementSibling as HTMLElement | null)?.textContent?.trim();
      if (nextText) {
        img.remove();
      } else {
        const name = img.getAttribute('alt') || img.getAttribute('src')?.split('/').pop()?.split('?')[0] || 'Uploaded Image';
        img.replaceWith(document.createTextNode(name + ' '));
      }
    }
  });

  const blockElements = tmp.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, br');
  blockElements.forEach((el) => {
    if (el.tagName === 'BR') {
      el.replaceWith('\n');
    } else {
      const textNode = document.createTextNode('\n' + (el.textContent || '') + '\n');
      el.replaceWith(textNode);
    }
  });

  return tmp.textContent || tmp.innerText || '';
};

export const getNoteTitle = (note: { title?: string | null; content: string }) =>
  note.title || getFirstLine(note.content);

export const getFirstLine = (content: string) => {
  const text = stripHtml(content);
  const lines = text.split('\n').map(line => line.trim()).filter(line => line !== '');
  const firstLine = lines[0] || 'New Note';
  return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
};
