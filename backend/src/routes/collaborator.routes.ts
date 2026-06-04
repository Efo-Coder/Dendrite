import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  inviteCollaborator,
  listCollaborators,
  removeCollaborator,
  getInvitations,
  acceptInvitation,
  declineInvitation,
  leaveCollaboration,
} from '../controllers/collaborator.controller';

const router = Router();

// Note-owner operations
router.post('/notes/:id/invite', authenticateToken, inviteCollaborator);
router.get('/notes/:id/collaborators', authenticateToken, listCollaborators);
router.delete('/notes/:id/collaborators/:userId', authenticateToken, removeCollaborator);

// Invited-user operations
router.get('/invitations', authenticateToken, getInvitations);
router.post('/invitations/:id/accept', authenticateToken, acceptInvitation);
router.delete('/invitations/:id', authenticateToken, declineInvitation);

// Collaborator leaving a note
router.delete('/notes/:id/leave', authenticateToken, leaveCollaboration);

export default router;
