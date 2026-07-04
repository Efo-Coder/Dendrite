import { Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { AuthRequest } from '../middleware/auth.middleware';

// Well below the model's context window; also caps cost per request.
const MAX_INPUT_CHARS = 150_000;

const SYSTEM_PROMPT = [
  'You turn raw, unstructured note text (often dictated speech) into a clean, well-organized note.',
  'Return Markdown only — no preamble, no commentary, no code fence around the whole output.',
  'Structure: a short level-1 heading as title, level-2 headings for topics, bullet lists for enumerations, concise paragraphs.',
  'Condense redundant or rambling passages and fix grammar and punctuation, but never invent facts that are not in the text.',
  'Write in the same language as the input text.',
].join('\n');

export const summarizeText = async (req: AuthRequest, res: Response) => {
  const { text } = req.body as { text?: string };

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI features are not configured on this server' });
  }
  if (!text?.trim()) {
    return res.status(400).json({ error: 'Text is required' });
  }
  if (text.length > MAX_INPUT_CHARS) {
    return res.status(400).json({ error: 'Note is too long to summarize' });
  }

  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: text }],
    });

    const markdown = response.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
      .trim();

    if (!markdown) {
      return res.status(502).json({ error: 'AI returned an empty result' });
    }
    return res.json({ markdown });
  } catch (err) {
    console.error('summarizeText error:', err);
    return res.status(500).json({ error: 'Failed to summarize note' });
  }
};
