import { useState, useEffect } from 'react';
import { UserPlus, X, LogOut, Loader2 } from 'lucide-react';
import Modal from './Modal';
import { Collaborator } from '../../types';
import { collaborationService } from '../../services/collaboration.service';
import { useAuthStore } from '../../store/useAuthStore';
import { useToast } from '../ui/ToastContainer';

const API_URL = import.meta.env.VITE_API_URL || '';
const resolveAvatar = (url: string) => (url.startsWith('http') ? url : `${API_URL}${url}`);

interface Props {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
  /** Wird aufgerufen wenn sich die Kollaboratoren-Liste ändert */
  onCollaboratorsChange?: () => void;
  isOwner: boolean;
}

const InviteCollaboratorModal = ({ isOpen, onClose, noteId, onCollaboratorsChange, isOwner }: Props) => {
  const { user } = useAuthStore();
  const toast = useToast();

  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);

  // Kollaboratoren laden wenn Modal öffnet
  useEffect(() => {
    if (!isOpen || !isOwner) return;
    setLoading(true);
    collaborationService
      .listCollaborators(noteId)
      .then(setCollaborators)
      .catch(() => toast.error('Fehler beim Laden'))
      .finally(() => setLoading(false));
  }, [isOpen, noteId, isOwner]);

  const handleInvite = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInviting(true);
    try {
      const collab = await collaborationService.invite(noteId, trimmed);
      setCollaborators(prev => [...prev, collab]);
      setInput('');
      toast.success('Einladung gesendet');
      onCollaboratorsChange?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Fehler beim Einladen');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId: string, isPending: boolean) => {
    try {
      await collaborationService.remove(noteId, userId);
      setCollaborators(prev => prev.filter(c => c.userId !== userId));
      toast.info(isPending ? 'Einladung zurückgezogen' : 'Kollaborator entfernt');
      onCollaboratorsChange?.();
    } catch {
      toast.error('Fehler beim Entfernen');
    }
  };

  const handleLeave = async () => {
    try {
      await collaborationService.leave(noteId);
      toast.info('Kollaboration verlassen');
      onClose();
      onCollaboratorsChange?.();
    } catch {
      toast.error('Fehler');
    }
  };

  const avatarInitial = (c: Collaborator) =>
    (c.user.name || c.user.email || '?').charAt(0).toUpperCase();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Zusammenarbeiten">
      <div className="flex flex-col gap-4">

        {/* Einladen (nur Owner) */}
        {isOwner && (
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 rounded-lg border border-(--line) bg-(--surface) px-3 py-2 text-sm text-(--ink) placeholder:text-(--ink-dim) focus:outline-none focus:border-(--accent)"
              placeholder="E-Mail oder Benutzername"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
              disabled={inviting}
            />
            <button
              onClick={handleInvite}
              disabled={inviting || !input.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-(--accent) px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              Einladen
            </button>
          </div>
        )}

        {/* Kollaboratoren-Liste */}
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-(--ink-dim)" />
          </div>
        ) : collaborators.length === 0 && isOwner ? (
          <p className="text-sm text-(--ink-dim) text-center py-2">
            Noch keine Eingeladenen. Gib oben eine E-Mail oder einen Nutzernamen ein.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {collaborators.map(c => (
              <li key={c.id} className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-(--surface-hi)">
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full bg-(--surface-hi) flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
                  {c.user.avatarUrl ? (
                    <img src={resolveAvatar(c.user.avatarUrl)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    avatarInitial(c)
                  )}
                </div>

                {/* Name + Status */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate text-(--ink)">{c.user.name || c.user.email}</p>
                  {c.status === 'pending' && (
                    <p className="text-xs text-(--ink-dim)">Ausstehend</p>
                  )}
                </div>

                {/* Entfernen-Button (Owner) oder Verlassen (eigener Eintrag) */}
                {isOwner ? (
                  <button
                    onClick={() => handleRemove(c.userId, c.status === 'pending')}
                    className="p-1 rounded hover:text-red-400 transition-colors text-(--ink-dim)"
                    title="Entfernen"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : c.userId === user?.id ? (
                  <button
                    onClick={handleLeave}
                    className="flex items-center gap-1 text-xs text-(--ink-dim) hover:text-red-400 transition-colors"
                    title="Kollaboration verlassen"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Verlassen
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {/* Hinweis auf Live-Editing */}
        <p className="text-xs text-(--ink-dim) border-t border-(--line) pt-3">
          Alle Eingeladenen können die Notiz live gleichzeitig bearbeiten.
        </p>
      </div>
    </Modal>
  );
};

export default InviteCollaboratorModal;
