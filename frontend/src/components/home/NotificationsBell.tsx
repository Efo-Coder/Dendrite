import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, Check, X, User } from 'lucide-react';
import { NotificationItem } from '../../types';
import { notificationService } from '../../services/notification.service';
import { collaborationService } from '../../services/collaboration.service';
import { useToast } from '../ui/ToastContainer';

const API_URL = import.meta.env.VITE_API_URL || '';

interface NotificationsBellProps {
  // Called after an invitation is accepted so Home can refresh its shared list.
  onAccepted?: () => void;
  onOpenProfile?: (userId: string) => void;
}

const NotificationsBell = ({ onAccepted, onOpenProfile }: NotificationsBellProps) => {
  const toast = useToast();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const { notifications, unreadCount } = await notificationService.list();
      setItems(notifications);
      setUnread(unreadCount);
    } catch {
      // Keep the last known list on a transient failure.
    }
  };

  // Initial load, then live updates over SSE. EventSource auto-reconnects; we
  // re-load on each (re)connect to catch anything created during a gap.
  useEffect(() => {
    load();
    const token = localStorage.getItem('token');
    if (!token) return;
    const es = new EventSource(`${API_URL}/api/notifications/stream?token=${encodeURIComponent(token)}`);
    es.onopen = () => load();
    es.onmessage = (e) => {
      try {
        const n = JSON.parse(e.data) as NotificationItem;
        setItems((prev) => [n, ...prev]);
        setUnread((u) => u + 1);
      } catch {
        // Ignore a malformed event.
      }
    };
    return () => es.close();
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

  const togglePanel = () => {
    setOpen((o) => {
      const next = !o;
      // Opening clears the unread badge.
      if (next && unread > 0) {
        setUnread(0);
        notificationService.markAllRead().catch(() => {});
      }
      return next;
    });
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((n) => n.id !== id));

  const handleAccept = async (n: Extract<NotificationItem, { type: 'collab_invite' }>) => {
    try {
      await collaborationService.accept(n.data.collaboratorId);
      await notificationService.remove(n.id);
      removeItem(n.id);
      toast.success('Invitation accepted');
      onAccepted?.();
    } catch {
      toast.error('Could not accept invitation');
    }
  };

  const handleDecline = async (n: Extract<NotificationItem, { type: 'collab_invite' }>) => {
    try {
      await collaborationService.decline(n.data.collaboratorId);
      await notificationService.remove(n.id);
      removeItem(n.id);
      toast.info('Invitation declined');
    } catch {
      toast.error('Could not decline invitation');
    }
  };

  const handleViewProfile = (followerId: string) => {
    setOpen(false);
    onOpenProfile?.(followerId);
  };

  // Optimistic dismiss: drop from the list right away, then delete server-side.
  const handleDismiss = async (id: string) => {
    removeItem(id);
    try {
      await notificationService.remove(id);
    } catch {
      // Already gone from the list; ignore a transient failure.
    }
  };

  return (
    <div ref={wrapRef} className="home-bell">
      <button type="button" className="home-icon-btn" onClick={togglePanel} title="Notifications">
        <Bell size={18} strokeWidth={1.75} />
        {unread > 0 && <span className="home-bell-badge">{unread}</span>}
      </button>

      {open && (
        <div className="home-notif-panel" data-lenis-prevent>
          <p className="home-notif-title">Notifications</p>
          {items.length === 0 ? (
            <p className="home-notif-empty">No notifications.</p>
          ) : (
            <ul className="home-notif-list">
              {/* layout + exit so a removed item collapses smoothly and the rest
                  slide up instead of snapping. */}
              <AnimatePresence initial={false}>
                {items.map((n) => (
                  <motion.li
                    key={n.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="home-notif-item"
                    style={{ overflow: 'hidden' }}
                  >
                    {n.type === 'collab_invite' ? (
                      <>
                        <div className="home-notif-text">
                          <p className="home-notif-note">{n.data.noteTitle || 'Untitled note'}</p>
                          <p className="home-notif-from">invite from {n.data.fromName || 'someone'}</p>
                        </div>
                        <button type="button" className="home-notif-accept" onClick={() => handleAccept(n)} title="Accept">
                          <Check size={14} strokeWidth={2} />
                        </button>
                        <button type="button" className="home-notif-decline" onClick={() => handleDecline(n)} title="Decline">
                          <X size={14} strokeWidth={2} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="home-notif-text">
                          <p className="home-notif-note">{n.data.name || 'Someone'} started following you.</p>
                        </div>
                        <button
                          type="button"
                          className="home-notif-accept"
                          onClick={() => handleViewProfile(n.data.followerId)}
                          title="View profile"
                        >
                          <User size={14} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          className="home-notif-decline"
                          onClick={() => handleDismiss(n.id)}
                          title="Dismiss"
                        >
                          <X size={14} strokeWidth={2} />
                        </button>
                      </>
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsBell;
