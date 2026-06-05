import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';

export const inviteCollaborator = async (req: AuthRequest, res: Response) => {
  try {
    const noteId = req.params.id as string;
    const { emailOrUsername } = req.body;

    if (!emailOrUsername) {
      return res.status(400).json({ error: 'Email or username is required' });
    }

    const note = await prisma.note.findFirst({ where: { id: noteId, userId: req.userId } });
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const invitee = await prisma.user.findFirst({
      where: { OR: [{ email: emailOrUsername }, { name: emailOrUsername }] },
    });

    if (!invitee) return res.status(404).json({ error: 'User not found' });
    if (invitee.id === req.userId) return res.status(400).json({ error: 'You cannot invite yourself' });

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
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      });
      return res.json({ collaborator: updated });
    }

    const role = req.body.role === 'viewer' ? 'viewer' : 'editor';

    const collab = await prisma.noteCollaborator.create({
      data: { noteId, userId: invitee.id, role, status: 'pending' },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
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
    });
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const collaborators = await prisma.noteCollaborator.findMany({
      where: { noteId },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { invitedAt: 'asc' },
    });

    return res.json({ collaborators });
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

export const getInvitations = async (req: AuthRequest, res: Response) => {
  try {
    const invitations = await prisma.noteCollaborator.findMany({
      where: { userId: req.userId!, status: 'pending' },
      include: {
        // Fetch note content + note owner in a single query
        note: { select: { id: true, title: true, content: true, user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { invitedAt: 'desc' },
    });

    const result = invitations.map(inv => ({
      ...inv,
      noteOwner: (inv.note as any).user ?? null,
      note: { id: inv.note.id, title: inv.note.title, content: inv.note.content },
    }));

    return res.json({ invitations: result });
  } catch (error) {
    console.error('GetInvitations error:', error);
    return res.status(500).json({ error: 'Failed to load invitations' });
  }
};

export const acceptInvitation = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const collab = await prisma.noteCollaborator.findFirst({
      where: { id, userId: req.userId!, status: 'pending' },
    });

    if (!collab) return res.status(404).json({ error: 'Invitation not found' });

    const updated = await prisma.noteCollaborator.update({
      where: { id },
      data: { status: 'accepted', acceptedAt: new Date() },
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
