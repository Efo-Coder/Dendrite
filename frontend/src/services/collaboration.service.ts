import api from './api';
import { Collaborator } from '../types';

export const collaborationService = {
  /** Owner + Kollaboratoren einer Notiz laden */
  async listCollaborators(
    noteId: string,
  ): Promise<{ owner: Collaborator['user']; collaborators: Collaborator[] }> {
    const res = await api.get<{ owner: Collaborator['user']; collaborators: Collaborator[] }>(
      `/notes/${noteId}/collaborators`,
    );
    return res.data;
  },

  /**
   * Invite a collaborator. Prefer `userId` from the people picker (unambiguous);
   * `emailOrUsername` is the fallback for direct entry of an exact email/handle.
   */
  async invite(
    noteId: string,
    target: { userId?: string; emailOrUsername?: string },
    role: 'editor' | 'viewer' = 'editor',
  ): Promise<Collaborator> {
    const res = await api.post<{ collaborator: Collaborator }>(`/notes/${noteId}/invite`, { ...target, role });
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
