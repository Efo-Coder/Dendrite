// Wrap a reflection prompt in typographic quotes for display — applied only to
// real prompts, never to the loading placeholders.
export function quotePrompt(prompt: string): string {
  return `“${prompt}”`;
}
