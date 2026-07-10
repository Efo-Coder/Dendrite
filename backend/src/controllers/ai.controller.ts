import { Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';
import { resolveUsage, currentPeriod } from '../lib/aiUsage';
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

  // Authorization before server-readiness: a free user must see 403 even when
  // no API key is configured. Summarize is a paid feature; enforce here so the
  // frontend gate can't be bypassed with a direct call to this expensive endpoint.
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { plan: true, aiSummarizeMonth: true, aiSummarizeCount: true },
  });
  const plan = (user?.plan || 'free').toLowerCase();
  if (plan !== 'writer' && plan !== 'author') {
    return res.status(403).json({ error: 'Writer plan required' });
  }

  const usage = resolveUsage(plan, user?.aiSummarizeMonth ?? null, user?.aiSummarizeCount ?? 0);
  if (usage.limit !== null && usage.used >= usage.limit) {
    return res.status(429).json({
      error: `Monthly summarize limit reached (${usage.limit}). Upgrade to Author for unlimited.`,
      usage,
    });
  }

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

    // Count only successful summaries; roll the month over on first use.
    const period = currentPeriod();
    const newUsed = usage.used + 1;
    await prisma.user.update({
      where: { id: req.userId! },
      data: { aiSummarizeMonth: period, aiSummarizeCount: newUsed },
    });

    return res.json({ markdown, usage: { used: newUsed, limit: usage.limit } });
  } catch (err) {
    console.error('summarizeText error:', err);
    return res.status(500).json({ error: 'Failed to summarize note' });
  }
};

// Current month's summarize usage for the signed-in user — drives the remaining
// counter on the editor button without leaking the raw fields onto the user object.
export const getSummarizeUsage = async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { plan: true, aiSummarizeMonth: true, aiSummarizeCount: true },
  });
  const usage = resolveUsage(user?.plan, user?.aiSummarizeMonth ?? null, user?.aiSummarizeCount ?? 0);
  return res.json(usage);
};
