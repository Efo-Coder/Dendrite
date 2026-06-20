import api from './api';
import { Collaborator } from '../types';

export const collaborationService = {
  /** Alle Kollaboratoren einer Notiz laden (nur Owner) */
  async listCollaborators(noteId: string): Promise<Collaborator[]> {
    const res = await api.get<{ collaborators: Collaborator[] }>(`/notes/${noteId}/collaborators`);
    return res.data.collaborators;
  },

  /** Benutzer per E-Mail oder Username einladen (role: 'editor' | 'viewer') */
  async invite(noteId: string, emailOrUsername: string, role: 'editor' | 'viewer' = 'editor'): Promise<Collaborator> {
    const res = await api.post<{ collaborator: Collaborator }>(`/notes/${noteId}/invite`, { emailOrUsername, role });
    return res.data.collaborator;
  },

  /** Kollaborator aus einer Notiz entfernen (nur Owner) */
  async remove(noteId: string, userId: string): Promise<void> {
    await api.delete(`/notes/${noteId}/collaborators/${userId}`);
  },

  /** Rolle eines Kollaborators ändern (nur Owner) */
  async updateRole(noteId: string, userId: string, role: 'editor' | 'viewer'): Promise<void> {
    await api.patch(`/notes/${noteId}/collaborators/${userId}`, { role });
  },

  /** Kollaboration verlassen (Kollaborator selbst) */
  async leave(noteId: string): Promise<void> {
    await api.delete(`/notes/${noteId}/leave`);
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
