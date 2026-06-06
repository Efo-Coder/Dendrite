import { useEffect, useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { Invitation } from '../../types';
import { collaborationService } from '../../services/collaboration.service';
import { useToast } from '../ui/ToastContainer';
import { useNoteStore } from '../../store/useNoteStore';

interface Props {
  /** Wird nach Annehmen/Ablehnen aufgerufen, damit die Note-Liste aktualisiert wird */
  onChanged: () => void;
}

const InvitationsPanel = ({ onChanged }: Props) => {
  const toast = useToast();
  const { fetchNoteCounts } = useNoteStore();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const list = await collaborationService.getInvitations();
      setInvitations(list);
    } catch {
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const handleAccept = async (inv: Invitation) => {
    try {
      await collaborationService.accept(inv.id);
      setInvitations(prev => prev.filter(i => i.id !== inv.id));
      toast.success('Invitation accepted');
      fetchNoteCounts();
      onChanged();
    } catch {
      toast.error('Failed to accept invitation');
    }
  };

  const handleDecline = async (inv: Invitation) => {
    try {
      await collaborationService.decline(inv.id);
      setInvitations(prev => prev.filter(i => i.id !== inv.id));
      toast.info('Invitation declined');
      fetchNoteCounts();
    } catch {
      toast.error('Failed to decline invitation');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-4 h-4 animate-spin text-(--ink-dim)" />
      </div>
    );
  }

  if (invitations.length === 0) return null;

  return (
    <div className="px-3 pb-2">
      <p className="text-xs font-medium text-(--ink-dim) uppercase tracking-widest mb-2 px-1">
        Pending invitations
      </p>
      <ul className="flex flex-col gap-1.5">
        {invitations.map(inv => (
          <li key={inv.id} className="flex items-center gap-2.5 rounded-lg p-2 bg-(--surface-hi)">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-(--ink)">
                {inv.note.title || 'Unbenannte Notiz'}
              </p>
              <p className="text-xs text-(--ink-dim)">
                from {inv.noteOwner?.name || inv.noteOwner?.email || 'Unknown'}
              </p>
            </div>
            <button
              onClick={() => handleAccept(inv)}
              className="p-1.5 rounded-md bg-(--accent) text-white hover:opacity-80 transition-opacity"
              title="Accept"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDecline(inv)}
              className="p-1.5 rounded-md border border-(--line) hover:text-red-400 transition-colors text-(--ink-mid)"
              title="Decline"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 border-t border-(--line)" />
    </div>
  );
};

export default InvitationsPanel;
