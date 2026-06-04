import api from './api';
import { Collaborator, Invitation } from '../types';

export const collaborationService = {
  /** Alle Kollaboratoren einer Notiz laden (nur Owner) */
  async listCollaborators(noteId: string): Promise<Collaborator[]> {
    const res = await api.get<{ collaborators: Collaborator[] }>(`/notes/${noteId}/collaborators`);
    return res.data.collaborators;
  },

  /** Benutzer per E-Mail oder Username einladen */
  async invite(noteId: string, emailOrUsername: string): Promise<Collaborator> {
    const res = await api.post<{ collaborator: Collaborator }>(`/notes/${noteId}/invite`, { emailOrUsername });
    return res.data.collaborator;
  },

  /** Kollaborator aus einer Notiz entfernen (nur Owner) */
  async remove(noteId: string, userId: string): Promise<void> {
    await api.delete(`/notes/${noteId}/collaborators/${userId}`);
  },

  /** Kollaboration verlassen (Kollaborator selbst) */
  async leave(noteId: string): Promise<void> {
    await api.delete(`/notes/${noteId}/leave`);
  },

  /** Offene Einladungen des eingeloggten Users abrufen */
  async getInvitations(): Promise<Invitation[]> {
    const res = await api.get<{ invitations: Invitation[] }>('/invitations');
    return res.data.invitations;
  },

  /** Einladung annehmen */
  async accept(invitationId: string): Promise<void> {
    await api.post(`/invitations/${invitationId}/accept`);
  },

  /** Einladung ablehnen */
  async decline(invitationId: string): Promise<void> {
    await api.delete(`/invitations/${invitationId}`);
  },
};
