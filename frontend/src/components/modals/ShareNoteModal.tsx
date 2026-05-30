import { useState, useEffect } from 'react';
import { Link2, Copy, Trash2, Loader2, Users } from 'lucide-react';
import Modal from './Modal';
import { getShare, createShare, deleteShare } from '../../services/share.service';
import { useToast } from '../ui/ToastContainer';

interface ShareNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
  onShareChange: (token: string | null) => void;
}

const ShareNoteModal = ({ isOpen, onClose, noteId, onShareChange }: ShareNoteModalProps) => {
  const toast = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setInitialLoading(true);
    getShare(noteId)
      .then(r => {
        setToken(r.data.token);
        onShareChange(r.data.token);
      })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, [isOpen, noteId]);

  const shareUrl = token
    ? `${window.location.origin}/shared/${token}`
    : null;

  const handleCreate = async () => {
    setLoading(true);
    try {
      const r = await createShare(noteId);
      setToken(r.data.token);
      onShareChange(r.data.token);
      toast.success('Link created');
    } catch {
      toast.error('Error creating link');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteShare(noteId);
      setToken(null);
      onShareChange(null);
      toast.info('Link deleted');
    } catch {
      toast.error('Error deleting link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share note">
      <div className="space-y-4 min-w-[320px]">
        <div className="flex items-start gap-3 text-sm text-(--ink-mid)">
          <Users className="w-4 h-4 mt-0.5 flex-shrink-0 text-(--accent)" />
          <span>
            Anyone with the link can collaborate on this note in real time.
          </span>
        </div>

        {initialLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-(--accent)" />
          </div>
        ) : shareUrl ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--line)_60%,transparent)] bg-[color-mix(in_srgb,var(--surface-hi)_50%,transparent)] px-3 py-2">
              <Link2 className="w-4 h-4 flex-shrink-0 text-(--accent)" />
              <span className="flex-1 truncate text-sm text-(--ink-mid) font-mono select-all">
                {shareUrl}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--line)_60%,transparent)] bg-(--accent) px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
              >
                <Copy className="w-4 h-4" />
                Copy link
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--line)_60%,transparent)] px-3 py-2 text-sm text-(--ink-mid) transition-colors hover:text-red-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-(--ink-low)">
              Collaboration mode is active. Changes are synced instantly.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-(--ink-mid)">
              This note is not shared yet. Create a link to collaborate.
            </p>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-(--accent) px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              Create link
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ShareNoteModal;
