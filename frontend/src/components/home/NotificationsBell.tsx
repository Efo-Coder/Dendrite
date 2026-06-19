import { useEffect, useRef, useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { Invitation } from '../../types';
import { collaborationService } from '../../services/collaboration.service';
import { useToast } from '../ui/ToastContainer';

interface NotificationsBellProps {
  // Called after an invitation is accepted so the Home can refresh (e.g. its
  // "Shared with me" section now has a new note).
  onAccepted?: () => void;
}

const NotificationsBell = ({ onAccepted }: NotificationsBellProps) => {
  const toast = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      setInvitations(await collaborationService.getInvitations());
    } catch {
      // Keep the last known list on a transient failure.
    }
  };

  // Poll for new invitations (same cadence as the old workspace sidebar).
  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  // Close the panel on an outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const handleAccept = async (inv: Invitation) => {
    try {
      await collaborationService.accept(inv.id);
      setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
      toast.success('Invitation accepted');
      onAccepted?.();
    } catch {
      toast.error('Could not accept invitation');
    }
  };

  const handleDecline = async (inv: Invitation) => {
    try {
      await collaborationService.decline(inv.id);
      setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
      toast.info('Invitation declined');
    } catch {
      toast.error('Could not decline invitation');
    }
  };

  const count = invitations.length;

  return (
    <div ref={wrapRef} className="home-bell">
      <button type="button" className="home-icon-btn" onClick={() => setOpen((o) => !o)} title="Invitations">
        <Bell size={18} strokeWidth={1.75} />
        {count > 0 && <span className="home-bell-badge">{count}</span>}
      </button>

      {open && (
        <div className="home-notif-panel">
          <p className="home-notif-title">Invitations</p>
          {count === 0 ? (
            <p className="home-notif-empty">No new invitations.</p>
          ) : (
            <ul className="home-notif-list">
              {invitations.map((inv) => (
                <li key={inv.id} className="home-notif-item">
                  <div className="home-notif-text">
                    <p className="home-notif-note">{inv.note.title || 'Untitled note'}</p>
                    <p className="home-notif-from">from {inv.noteOwner?.name || inv.noteOwner?.email || 'someone'}</p>
                  </div>
                  <button type="button" className="home-notif-accept" onClick={() => handleAccept(inv)} title="Accept">
                    <Check size={14} strokeWidth={2} />
                  </button>
                  <button type="button" className="home-notif-decline" onClick={() => handleDecline(inv)} title="Decline">
                    <X size={14} strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsBell;
