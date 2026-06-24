import { useState, useEffect, useRef } from 'react';
import { UserPlus, X, LogOut, Loader2, Eye, Pencil, Shield, AtSign } from 'lucide-react';
import Modal from './Modal';
import { MagicInput } from '../ui/MagicInput';
import { Collaborator, UserSearchResult } from '../../types';
import { collaborationService } from '../../services/collaboration.service';
import { profileService } from '../../services/profile.service';
import { useAuthStore } from '../../store/useAuthStore';
import { useToast } from '../ui/ToastContainer';
import { getApiErrorMessage } from '../../lib/apiError';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const API_URL = import.meta.env.VITE_API_URL || '';
const resolveAvatar = (url: string) => (url.startsWith('http') ? url : `${API_URL}${url}`);

type Role = 'editor' | 'viewer';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
  onCollaboratorsChange?: () => void;
  isOwner: boolean;
  // userIds currently connected to the Yjs room — drives the green presence dot.
  onlineUserIds: Set<string>;
}

const RoleBadge = ({ role }: { role: Role | 'admin' }) => {
  if (role === 'admin') {
    return (
      <span className="flex items-center gap-1 text-xs text-(--accent)">
        <Shield className="w-3 h-3" /> Admin
      </span>
    );
  }
  return role === 'viewer' ? (
    <span className="flex items-center gap-1 text-xs text-(--ink-dim)">
      <Eye className="w-3 h-3" /> View only
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs text-(--accent)">
      <Pencil className="w-3 h-3" /> Editor
    </span>
  );
};

// Avatar with an optional presence dot; shared by the owner row and collaborators.
const Avatar = ({ person, online }: { person: Collaborator['user']; online: boolean }) => (
  <div className="relative shrink-0">
    <div className="w-7 h-7 rounded-full bg-(--surface-hi) flex items-center justify-center text-xs font-semibold overflow-hidden">
      {person.avatarUrl
        ? <img src={resolveAvatar(person.avatarUrl)} alt="" className="w-full h-full object-cover" />
        : (person.name || person.email || '?').charAt(0).toUpperCase()
      }
    </div>
    {online && (
      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-(--bg)" />
    )}
  </div>
);

const InviteCollaboratorModal = ({ isOpen, onClose, noteId, onCollaboratorsChange, isOwner, onlineUserIds }: Props) => {
  const { user } = useAuthStore();
  const toast = useToast();

  const [owner, setOwner] = useState<Collaborator['user'] | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [input, setInput] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('editor');
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    collaborationService
      .listCollaborators(noteId)
      .then(({ owner, collaborators }) => {
        setOwner(owner);
        setCollaborators(collaborators);
      })
      .catch(() => toast.error('Failed to load collaborators'))
      .finally(() => setLoading(false));
  }, [isOpen, noteId]);

  // Debounced people search; hides users who are already participants.
  const handleInputChange = (value: string) => {
    setInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = value.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const hits = await profileService.search(q);
        const taken = new Set([owner?.id, ...collaborators.map(c => c.userId)].filter(Boolean));
        setResults(hits.filter(h => !taken.has(h.id)));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const inviteTarget = async (target: { userId?: string; emailOrUsername?: string }) => {
    setInviting(true);
    try {
      const collab = await collaborationService.invite(noteId, target, inviteRole);
      setCollaborators(prev => [...prev, collab]);
      setInput('');
      setResults([]);
      toast.success('Invitation sent');
      onCollaboratorsChange?.();
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Failed to send invitation'));
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Collaborate" showFooter cancelLabel="Close">
      <div className="flex flex-col gap-4">

        {/* Invite row — search people, pick to invite */}
        {isOwner && (
          <div className="relative flex gap-2">
            <MagicInput
              type="text"
              className="w-full rounded-xl border border-(--line) bg-(--surface) px-3 py-2 text-sm text-(--ink) placeholder:text-(--ink-dim) focus:outline-none"
              placeholder="Name, @username or email"
              value={input}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={e => {
                // Enter only commits the email fallback; users are picked by click.
                if (e.key === 'Enter' && EMAIL_RE.test(input.trim())) inviteTarget({ emailOrUsername: input.trim() });
              }}
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

            {/* People picker dropdown */}
            {input.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-10 rounded-xl border border-(--line) bg-(--surface) shadow-lg overflow-hidden">
                {searching ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-(--ink-dim)">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching…
                  </div>
                ) : results.length > 0 ? (
                  results.map(hit => (
                    <button
                      key={hit.id}
                      type="button"
                      onClick={() => inviteTarget({ userId: hit.id })}
                      disabled={inviting}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-(--surface-hi) disabled:opacity-50 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-(--surface-hi) flex items-center justify-center text-xs font-semibold overflow-hidden shrink-0">
                        {hit.avatarUrl
                          ? <img src={resolveAvatar(hit.avatarUrl)} alt="" className="w-full h-full object-cover" />
                          : (hit.name || hit.username || '?').charAt(0).toUpperCase()
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate text-(--ink)">{hit.name || hit.username}</p>
                        {hit.username && <p className="text-xs truncate text-(--ink-dim)">@{hit.username}</p>}
                      </div>
                      <UserPlus className="w-3.5 h-3.5 text-(--ink-dim) shrink-0" />
                    </button>
                  ))
                ) : EMAIL_RE.test(input.trim()) ? (
                  <button
                    type="button"
                    onClick={() => inviteTarget({ emailOrUsername: input.trim() })}
                    disabled={inviting}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-(--surface-hi) disabled:opacity-50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-(--surface-hi) flex items-center justify-center shrink-0">
                      <AtSign className="w-3.5 h-3.5 text-(--ink-dim)" />
                    </div>
                    <span className="text-sm text-(--ink)">Invite <span className="text-(--ink-mid)">{input.trim()}</span> by email</span>
                  </button>
                ) : (
                  <div className="px-3 py-2.5 text-sm text-(--ink-dim)">No people found</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Participant list */}
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-(--ink-dim)" />
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {/* Owner — shown as Admin, no role toggle or removal */}
            {owner && (
              <li className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
                <Avatar person={owner} online={onlineUserIds.has(owner.id)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate text-(--ink)">
                    {owner.name || owner.email}{owner.id === user?.id ? ' (You)' : ''}
                  </p>
                </div>
                <span className="shrink-0"><RoleBadge role="admin" /></span>
              </li>
            )}

            {collaborators.length === 0 && isOwner && (
              <li className="px-2 py-1.5 text-sm text-(--ink-dim)">
                No collaborators yet. Search for people to invite above.
              </li>
            )}

            {collaborators.map(c => (
              <li key={c.id} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-(--surface-hi)">
                <Avatar person={c.user} online={onlineUserIds.has(c.userId)} />

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
