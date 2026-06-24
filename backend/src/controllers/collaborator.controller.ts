import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { notifyCollabInvite, notifyCollabAccepted } from '../services/notification.service';

export const inviteCollaborator = async (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id as string;
    const { userId, emailOrUsername } = req.body;

    if (!userId && !emailOrUsername) {
      return res.status(400).json({ error: 'A user is required' });
    }

    const note = await prisma.note.findFirst({ where: { id: noteId, userId: req.userId } });
    if (!note) return res.status(404).json({ error: 'Note not found' });

    // Prefer the unambiguous id from the picker; fall back to an exact email or
    // username match for direct entry (both are unique, so never ambiguous).
    const handle = emailOrUsername ? String(emailOrUsername).trim() : '';
    const invitee = userId
      ? await prisma.user.findUnique({ where: { id: String(userId) } })
      : await prisma.user.findFirst({
          where: { OR: [{ email: handle }, { username: handle.toLowerCase() }] },
        });

    if (!invitee) return res.status(404).json({ error: 'User not found' });
    if (invitee.id === req.userId) return res.status(400).json({ error: 'You cannot invite yourself' });

    const inviter = await prisma.user.findUnique({ where: { id: req.userId! }, select: { name: true } });

    const existing = await prisma.noteCollaborator.findUnique({
      where: { noteId_userId: { noteId, userId: invitee.id } },
    });

    if (existing) {
      if (existing.status === 'accepted') return res.status(400).json({ error: 'User is already a collaborator' });
      if (existing.status === 'pending') return res.status(400).json({ error: 'Invitation already sent' });
      // declined → re-invite
      const updated = await prisma.noteCollaborator.update({
        where: { noteId_userId: { noteId, userId: invitee.id } },
        data: { status: 'pending', invitedAt: new Date(), acceptedAt: null },
        include: { user: { select: { id: true, name: true, username: true, email: true, avatarUrl: true } } },
      });
      await notifyCollabInvite(invitee.id, {
        collaboratorId: updated.id,
        noteId,
        noteTitle: note.title,
        fromName: inviter?.name ?? null,
      });
      return res.json({ collaborator: updated });
    }

    const role = req.body.role === 'viewer' ? 'viewer' : 'editor';

    const collab = await prisma.noteCollaborator.create({
      data: { noteId, userId: invitee.id, role, status: 'pending' },
      include: { user: { select: { id: true, name: true, username: true, email: true, avatarUrl: true } } },
    });

    await notifyCollabInvite(invitee.id, {
      collaboratorId: collab.id,
      noteId,
      noteTitle: note.title,
      fromName: inviter?.name ?? null,
    });

    return res.status(201).json({ collaborator: collab });
  } catch (error) {
    console.error('InviteCollaborator error:', error);
    return res.status(500).json({ error: 'Failed to send invitation' });
  }
};

export const listCollaborators = async (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id as string;

    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        OR: [
          { userId: req.userId },
          { collaborators: { some: { userId: req.userId!, status: 'accepted' } } },
        ],
      },
      // Owner is shown as the "Admin" participant — every viewer/editor needs it.
      include: { user: { select: { id: true, name: true, username: true, email: true, avatarUrl: true } } },
    });
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const collaborators = await prisma.noteCollaborator.findMany({
      where: { noteId },
      include: { user: { select: { id: true, name: true, username: true, email: true, avatarUrl: true } } },
      orderBy: { invitedAt: 'asc' },
    });

    return res.json({ owner: note.user, collaborators });
  } catch (error) {
    console.error('ListCollaborators error:', error);
    return res.status(500).json({ error: 'Failed to load collaborators' });
  }
};

export const removeCollaborator = async (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id as string;
    const targetUserId = req.params.userId as string;

    const note = await prisma.note.findFirst({ where: { id: noteId, userId: req.userId } });
    if (!note) return res.status(404).json({ error: 'Note not found' });

    await prisma.noteCollaborator.deleteMany({ where: { noteId, userId: targetUserId } });

    return res.json({ message: 'Collaborator removed' });
  } catch (error) {
    console.error('RemoveCollaborator error:', error);
    return res.status(500).json({ error: 'Failed to remove collaborator' });
  }
};

export const acceptInvitation = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const collab = await prisma.noteCollaborator.findFirst({
      where: { id, userId: req.userId!, status: 'pending' },
      include: { note: { select: { id: true, title: true, userId: true } } },
    });

    if (!collab) return res.status(404).json({ error: 'Invitation not found' });

    const updated = await prisma.noteCollaborator.update({
      where: { id },
      data: { status: 'accepted', acceptedAt: new Date() },
    });

    // Let the note owner know the invite was accepted.
    const accepter = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { id: true, name: true, avatarUrl: true },
    });
    await notifyCollabAccepted(collab.note.userId, {
      noteId: collab.note.id,
      noteTitle: collab.note.title,
      fromUserId: req.userId!,
      fromName: accepter?.name ?? null,
      fromAvatarUrl: accepter?.avatarUrl ?? null,
    });

    return res.json({ collaborator: updated });
  } catch (error) {
    console.error('AcceptInvitation error:', error);
    return res.status(500).json({ error: 'Failed to accept invitation' });
  }
};

export const declineInvitation = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const collab = await prisma.noteCollaborator.findFirst({
      where: { id, userId: req.userId!, status: 'pending' },
    });

    if (!collab) return res.status(404).json({ error: 'Invitation not found' });

    await prisma.noteCollaborator.delete({ where: { id } });

    return res.json({ message: 'Invitation declined' });
  } catch (error) {
    console.error('DeclineInvitation error:', error);
    return res.status(500).json({ error: 'Failed to decline invitation' });
  }
};

export const updateCollaboratorRole = async (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id as string;
    const targetUserId = req.params.userId as string;
    const { role } = req.body;

    if (role !== 'editor' && role !== 'viewer') {
      return res.status(400).json({ error: 'Role must be "editor" or "viewer"' });
    }

    const note = await prisma.note.findFirst({ where: { id: noteId, userId: req.userId } });
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const updated = await prisma.noteCollaborator.updateMany({
      where: { noteId, userId: targetUserId },
      data: { role },
    });

    return res.json({ updated: updated.count });
  } catch (error) {
    console.error('UpdateCollaboratorRole error:', error);
    return res.status(500).json({ error: 'Failed to update role' });
  }
};

export const leaveCollaboration = async (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id as string;

    await prisma.noteCollaborator.deleteMany({ where: { noteId, userId: req.userId! } });

    return res.json({ message: 'Left collaboration' });
  } catch (error) {
    console.error('LeaveCollaboration error:', error);
    return res.status(500).json({ error: 'Failed to leave collaboration' });
  }
};
