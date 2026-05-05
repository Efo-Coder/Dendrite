import { useState, useEffect } from 'react';
import { Attachment } from '../types';
import { attachmentService } from '../services/attachment.service';
import { FileText, X, Download, Loader2 } from 'lucide-react';
import { useToast } from './ToastContainer';

interface AttachmentListProps {
  noteId: string;
  onAttachmentsChange?: () => void;
}

const AttachmentList = ({ noteId, onAttachmentsChange }: AttachmentListProps) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    loadAttachments();
  }, [noteId]);

  const loadAttachments = async () => {
    setIsLoading(true);
    try {
      const data = await attachmentService.getAttachmentsByNoteId(noteId);
      setAttachments(data);
    } catch (error) {
      console.error('Fehler beim Laden der Attachments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Möchtest du dieses Attachment wirklich löschen?')) {
      return;
    }

    setDeletingId(id);
    try {
      await attachmentService.deleteAttachment(id);
      setAttachments(attachments.filter((a) => a.id !== id));
      toast.success('Attachment gelÃ¶scht');
      if (onAttachmentsChange) onAttachmentsChange();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      toast.error('Fehler beim Löschen des Attachments');
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const isImageFile = (fileType: string): boolean => {
    return fileType.startsWith('image/');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 text-accent-subtle animate-spin" />
      </div>
    );
  }

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="px-6 md:px-12 py-4 border-t glass-divider">
      <h4 className="text-sm font-medium text-accent-secondary mb-3">
        AnhÃ¤nge ({attachments.length})
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {attachments.map((attachment) => {
          const attachmentUrl = attachmentService.getAttachmentUrl(attachment.url);
          const isImage = isImageFile(attachment.fileType);

          return (
            <div
              key={attachment.id}
              className="flex items-start space-x-3 p-3 glass-surface rounded-xl hover:border-white/40 transition-colors"
            >
              {isImage ? (
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0"
                >
                  <img
                    src={attachmentUrl}
                    alt={attachment.filename}
                    className="w-12 h-12 object-cover rounded"
                  />
                </a>
              ) : (
                <div className="flex-shrink-0 w-12 h-12 bg-white/30 rounded flex items-center justify-center border border-white/30">
                  <FileText className="w-6 h-6 text-accent-subtle" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent-fg hover:text-accent-brand transition-colors truncate block font-medium"
                  title={attachment.filename}
                >
                  {attachment.filename}
                </a>
                <p className="text-xs text-accent-subtle mt-0.5">
                  {formatFileSize(attachment.fileSize)}
                </p>
              </div>

              <div className="flex items-center space-x-1 flex-shrink-0">
                <a
                  href={attachmentUrl}
                  download={attachment.filename}
                  className="p-1.5 rounded text-accent-subtle hover-highlight hover:text-accent-brand transition-colors"
                  title="Herunterladen"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => handleDelete(attachment.id)}
                  disabled={deletingId === attachment.id}
                  className="p-1.5 rounded text-accent-subtle hover-highlight hover:text-red-500 transition-colors disabled:opacity-50"
                  title="Löschen"
                >
                  {deletingId === attachment.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AttachmentList;

