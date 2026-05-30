import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';

export const getShare = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params['id'] as string;
  const userId = req.userId!;

  const note = await prisma.note.findFirst({ where: { id, userId } });
  if (!note) { res.status(404).json({ error: 'Notiz nicht gefunden' }); return; }

  const share = await prisma.noteShare.findFirst({ where: { noteId: id } });
  res.json({ token: share?.token ?? null });
};

export const createShare = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params['id'] as string;
  const userId = req.userId!;

  const note = await prisma.note.findFirst({ where: { id, userId } });
  if (!note) { res.status(404).json({ error: 'Notiz nicht gefunden' }); return; }

  const existing = await prisma.noteShare.findFirst({ where: { noteId: id } });
  if (existing) { res.json({ token: existing.token }); return; }

  const share = await prisma.noteShare.create({ data: { noteId: id } });
  res.status(201).json({ token: share.token });
};

export const deleteShare = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params['id'] as string;
  const userId = req.userId!;

  const note = await prisma.note.findFirst({ where: { id, userId } });
  if (!note) { res.status(404).json({ error: 'Notiz nicht gefunden' }); return; }

  await prisma.noteShare.deleteMany({ where: { noteId: id } });
  res.json({ ok: true });
};

export const getSharedNote = async (req: AuthRequest, res: Response): Promise<void> => {
  const token = req.params['token'] as string;

  const share = await prisma.noteShare.findUnique({
    where: { token },
    include: {
      note: {
        include: {
          folder: true,
          noteTags: { include: { tag: true }, orderBy: { createdAt: 'asc' } },
        },
      },
    },
  });

  if (!share) { res.status(404).json({ error: 'Link ungültig oder abgelaufen' }); return; }
  if (share.expiresAt && share.expiresAt < new Date()) {
    res.status(410).json({ error: 'Dieser Link ist abgelaufen' }); return;
  }

  const { noteTags, ...noteRest } = share.note as any;
  const note = { ...noteRest, tags: (noteTags ?? []).map((nt: any) => nt.tag) };
  res.json({ note, shareToken: share.token });
};

export const updateSharedNote = async (req: AuthRequest, res: Response): Promise<void> => {
  const token = req.params['token'] as string;
  const { content, title } = req.body as { content?: string; title?: string };

  const share = await prisma.noteShare.findUnique({ where: { token } });
  if (!share) { res.status(404).json({ error: 'Link ungültig' }); return; }
  if (share.expiresAt && share.expiresAt < new Date()) {
    res.status(410).json({ error: 'Dieser Link ist abgelaufen' }); return;
  }

  const updated = await prisma.note.update({
    where: { id: share.noteId },
    data: {
      ...(content !== undefined && { content }),
      ...(title !== undefined && { title }),
    },
  });
  res.json(updated);
};
