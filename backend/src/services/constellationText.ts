// Shared tokenizing for constellation theme derivation: strips note HTML and
// reduces it to meaningful lowercase terms (EN/DE stopwords removed). Used by
// both the graph builder and the per-theme note lookup.

const CONTENT_SCAN_CHARS = 2000; // bound tokenizing cost per note

// Compact EN+DE stopword set — enough to keep keyword extraction meaningful
// without shipping a full NLP corpus.
export const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'your', 'with', 'this', 'that', 'have',
  'from', 'they', 'will', 'would', 'there', 'their', 'what', 'about', 'which', 'when', 'were',
  'been', 'into', 'than', 'then', 'them', 'some', 'just', 'like', 'also', 'more', 'most', 'such',
  'only', 'over', 'very', 'much', 'many', 'each', 'other', 'these', 'those', 'here', 'because',
  'und', 'der', 'die', 'das', 'ich', 'nicht', 'ein', 'eine', 'einen', 'einem', 'einer', 'mit',
  'auch', 'auf', 'aus', 'dem', 'den', 'des', 'für', 'ist', 'sind', 'war', 'sich', 'aber', 'oder',
  'wie', 'was', 'wenn', 'noch', 'nur', 'schon', 'mehr', 'sehr', 'haben', 'wird', 'werden', 'kann',
  'man', 'als', 'bei', 'wir', 'sie', 'ihr', 'uns', 'vom', 'zum', 'zur', 'doch', 'dann', 'diese',
]);

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ');
}

export function tokenize(html: string): string[] {
  const text = stripHtml(html).slice(0, CONTENT_SCAN_CHARS).toLowerCase();
  const matches = text.match(/[\p{L}]{3,}/gu) || [];
  return matches.filter((w) => !STOPWORDS.has(w));
}

export function uniqueTerms(tokens: string[]): Set<string> {
  return new Set(tokens);
}

// First non-empty line of a note's content, for compact previews.
export function firstLine(html: string): string {
  const text = stripHtml(html).replace(/\s+/g, ' ').trim();
  return text.slice(0, 120);
}
