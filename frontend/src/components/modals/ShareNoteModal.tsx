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
      toast.success('Link erstellt');
    } catch {
      toast.error('Fehler beim Erstellen des Links');
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
      toast.info('Link gelöscht');
    } catch {
      toast.error('Fehler beim Löschen des Links');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Link kopiert');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Notiz teilen">
      <div className="space-y-4 min-w-[320px]">
        <div className="flex items-start gap-3 text-sm text-text-secondary">
          <Users className="w-4 h-4 mt-0.5 flex-shrink-0 text-brand-primary" />
          <span>
            Personen mit dem Link können die Notiz in Echtzeit mitbearbeiten.
          </span>
        </div>

        {initialLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
          </div>
        ) : shareUrl ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--color-border-default)_60%,transparent)] bg-[color-mix(in_srgb,var(--color-bg-elevated)_50%,transparent)] px-3 py-2">
              <Link2 className="w-4 h-4 flex-shrink-0 text-brand-primary" />
              <span className="flex-1 truncate text-sm text-text-secondary font-mono select-all">
                {shareUrl}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--color-border-default)_60%,transparent)] bg-brand-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
              >
                <Copy className="w-4 h-4" />
                Link kopieren
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--color-border-default)_60%,transparent)] px-3 py-2 text-sm text-text-secondary transition-colors hover:text-red-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-text-muted">
              Kollaborationsmodus ist aktiv. Änderungen werden sofort synchronisiert.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              Diese Notiz ist noch nicht geteilt. Erstelle einen Link, um gemeinsam zu arbeiten.
            </p>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              Link erstellen
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ShareNoteModal;
