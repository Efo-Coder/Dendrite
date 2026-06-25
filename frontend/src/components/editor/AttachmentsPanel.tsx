import { useState, useEffect, useRef } from 'react';
import { useMagicHover } from '../../hooks/useMagicHover';
import { Attachment } from '../../types';
import { attachmentService } from '../../services/attachment.service';
import { formatFileSize, fileIconFor } from './AttachmentNode';
import { Paperclip, X, Download, Trash2 } from 'lucide-react';

interface AttachmentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
}

export default function AttachmentsPanel({ isOpen, onClose, noteId }: AttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const { containerRef, onItemEnter, onItemLeave, Indicator } = useMagicHover({
    ref: listRef,
    inset: 0,
    borderRadius: 9,
  });

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    attachmentService.getAttachmentsByNoteId(noteId)
      .then(setAttachments)
      .catch(() => setAttachments([]))
      .finally(() => setLoading(false));
  }, [isOpen, noteId]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await attachmentService.deleteAttachment(id);
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    } catch {
      /* keep the row on failure */
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      className="absolute right-0 top-0 bottom-0 w-70 border-l border-(--line-soft) transition-transform duration-300 ease-out z-20"
      style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
    >
      <div className="w-full h-full flex flex-col bg-(--surface)">
        <div className="flex items-center justify-between px-4 py-3 border-b border-(--line-soft) shrink-0">
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-(--accent)" />
            <span className="text-sm font-medium text-(--ink)">Attachments</span>
          </div>
          <button onClick={onClose} className="icon-btn-md rounded-lg transition-colors" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={containerRef} className="flex-1 overflow-y-auto px-2 py-3 relative">
          {Indicator}

          {loading && (
            <div className="flex items-center justify-center h-24">
              <span className="text-sm text-(--ink-dim)">Loading…</span>
            </div>
          )}

          {!loading && attachments.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 h-32 text-center px-4">
              <Paperclip className="w-8 h-8 text-(--ink-dim) opacity-40" />
              <p className="text-sm text-(--ink-dim)">No attachments yet.</p>
              <p className="text-[11px] text-(--ink-dim) opacity-70">Use the paperclip in the toolbar to attach files.</p>
            </div>
          )}

          {!loading && attachments.map((a) => {
            const Icon = fileIconFor(a.fileType);
            const isDeleting = deletingId === a.id;
            return (
              <div
                key={a.id}
                onMouseEnter={onItemEnter}
                onMouseLeave={onItemLeave}
                className="group rounded-xl px-3 py-2.5 mb-1 relative z-10 flex items-center gap-2.5"
              >
                <Icon className="w-5 h-5 shrink-0 text-(--accent)" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-(--ink) truncate">{a.filename}</p>
                  <p className="text-[11px] text-(--ink-dim) mt-0.5">{formatFileSize(a.fileSize)}</p>
                </div>
                <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={attachmentService.getAttachmentUrl(a.url)}
                    download={a.filename}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="icon-btn-md rounded-lg transition-colors hover:text-(--accent)"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => handleDelete(a.id)}
                    disabled={isDeleting}
                    className="icon-btn-md rounded-lg transition-colors hover:text-(--danger) disabled:opacity-50"
                    title="Delete attachment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
