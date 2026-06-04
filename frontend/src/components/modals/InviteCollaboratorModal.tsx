import { useState, useEffect } from 'react';
import { UserPlus, X, LogOut, Loader2, Eye, Pencil } from 'lucide-react';
import Modal from './Modal';
import { MagicInput } from '../ui/MagicInput';
import { Collaborator } from '../../types';
import { collaborationService } from '../../services/collaboration.service';
import { useAuthStore } from '../../store/useAuthStore';
import { useToast } from '../ui/ToastContainer';

const API_URL = import.meta.env.VITE_API_URL || '';
const resolveAvatar = (url: string) => (url.startsWith('http') ? url : `${API_URL}${url}`);

type Role = 'editor' | 'viewer';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
  onCollaboratorsChange?: () => void;
  isOwner: boolean;
}

const RoleBadge = ({ role }: { role: Role }) =>
  role === 'viewer' ? (
    <span className="flex items-center gap-1 text-xs text-(--ink-dim)">
      <Eye className="w-3 h-3" /> View only
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs text-(--accent)">
      <Pencil className="w-3 h-3" /> Editor
    </span>
  );

const InviteCollaboratorModal = ({ isOpen, onClose, noteId, onCollaboratorsChange, isOwner }: Props) => {
  const { user } = useAuthStore();
  const toast = useToast();

  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [input, setInput] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('editor');
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!isOpen || !isOwner) return;
    setLoading(true);
    collaborationService
      .listCollaborators(noteId)
      .then(setCollaborators)
      .catch(() => toast.error('Failed to load collaborators'))
      .finally(() => setLoading(false));
  }, [isOpen, noteId, isOwner]);

  const handleInvite = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInviting(true);
    try {
      const collab = await collaborationService.invite(noteId, trimmed, inviteRole);
      setCollaborators(prev => [...prev, collab]);
      setInput('');
      toast.success('Invitation sent');
      onCollaboratorsChange?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId: string, isPending: boolean) => {
    try {
      await collaborationService.remove(noteId, userId);
      setCollaborators(prev => prev.filter(c => c.userId !== userId));
      toast.info(isPending ? 'Invitation withdrawn' : 'Collaborator removed');
      onCollaboratorsChange?.();
    } catch {
      toast.error('Failed to remove');
    }
  };

  const handleRoleToggle = async (collab: Collaborator) => {
    const newRole: Role = collab.role === 'editor' ? 'viewer' : 'editor';
    try {
      await collaborationService.updateRole(noteId, collab.userId, newRole);
      setCollaborators(prev => prev.map(c => c.id === collab.id ? { ...c, role: newRole } : c));
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleLeave = async () => {
    try {
      await collaborationService.leave(noteId);
      toast.info('Left collaboration');
      onClose();
      onCollaboratorsChange?.();
    } catch {
      toast.error('Something went wrong');
    }
  };

  const avatarInitial = (c: Collaborator) =>
    (c.user.name || c.user.email || '?').charAt(0).toUpperCase();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Collaborate">
      <div className="flex flex-col gap-4">

        {/* Invite row */}
        {isOwner && (
          <div className="flex gap-2">
            <MagicInput
              type="text"
              className="w-full rounded-xl border border-(--line) bg-(--surface) px-3 py-2 text-sm text-(--ink) placeholder:text-(--ink-dim) focus:outline-none"
              placeholder="Email or username"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
              disabled={inviting}
            />

            {/* Role toggle pill */}
            <button
              type="button"
              onClick={() => setInviteRole(r => r === 'editor' ? 'viewer' : 'editor')}
              className="shrink-0 flex items-center gap-1.5 rounded-xl border border-(--line) bg-(--surface) px-3 py-2 text-xs text-(--ink-mid) hover:text-(--ink) transition-colors"
              title="Toggle role"
            >
              {inviteRole === 'editor'
                ? <><Pencil className="w-3 h-3 text-(--accent)" /> Editor</>
                : <><Eye className="w-3 h-3" /> Viewer</>
              }
            </button>

            <button
              onClick={handleInvite}
              disabled={inviting || !input.trim()}
              className="shrink-0 flex items-center gap-1.5 rounded-xl bg-(--accent) px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              Invite
            </button>
          </div>
        )}

        {/* Collaborator list */}
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-(--ink-dim)" />
          </div>
        ) : collaborators.length === 0 && isOwner ? (
          <p className="text-sm text-(--ink-dim) text-center py-2">
            No collaborators yet. Enter an email or username above.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {collaborators.map(c => (
              <li key={c.id} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-(--surface-hi)">
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full bg-(--surface-hi) flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
                  {c.user.avatarUrl
                    ? <img src={resolveAvatar(c.user.avatarUrl)} alt="" className="w-full h-full object-cover" />
                    : avatarInitial(c)
                  }
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate text-(--ink)">{c.user.name || c.user.email}</p>
                  {c.status === 'pending' && (
                    <p className="text-xs text-(--ink-dim)">Pending</p>
                  )}
                </div>

                {/* Role toggle (owner only, accepted collabs) */}
                {isOwner && c.status === 'accepted' && (
                  <button
                    onClick={() => handleRoleToggle(c)}
                    className="shrink-0 rounded-lg border border-(--line) px-2 py-1 hover:border-(--accent) hover:text-(--accent) transition-colors"
                    title="Click to toggle role"
                  >
                    <RoleBadge role={c.role as Role} />
                  </button>
                )}

                {/* Role label for pending */}
                {isOwner && c.status === 'pending' && (
                  <span className="shrink-0 opacity-50">
                    <RoleBadge role={c.role as Role} />
                  </span>
                )}

                {/* Remove (owner) or Leave (self) */}
                {isOwner ? (
                  <button
                    onClick={() => handleRemove(c.userId, c.status === 'pending')}
                    className="p-1 rounded hover:text-red-400 transition-colors text-(--ink-dim)"
                    title="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : c.userId === user?.id ? (
                  <button
                    onClick={handleLeave}
                    className="flex items-center gap-1 text-xs text-(--ink-dim) hover:text-red-400 transition-colors"
                    title="Leave collaboration"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Leave
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-(--ink-dim) border-t border-(--line) pt-3">
          Editors can write. Viewers can read but not edit.
        </p>
      </div>
    </Modal>
  );
};

export default InviteCollaboratorModal;
