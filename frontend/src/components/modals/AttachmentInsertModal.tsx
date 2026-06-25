import { useState, useRef, useEffect } from 'react';
import { Upload, X, File as FileIcon } from 'lucide-react';
import Modal from './Modal';
import { attachmentService } from '../../services/attachment.service';
import { AttachmentPayload } from '../editor/AttachmentNode';
import { getApiErrorMessage } from '../../lib/apiError';

interface AttachmentInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
  onInsert: (payload: AttachmentPayload) => void;
  // Lets the note-level list refresh after a successful upload.
  onUploaded?: () => void;
}

// Mirrors the backend multer allow-list (multer.config.ts).
const ACCEPT = '.pdf,.txt,.doc,.docx,.xls,.xlsx,image/*';
const MAX_SIZE = 10 * 1024 * 1024;

const AttachmentInsertModal = ({ isOpen, onClose, noteId, onInsert, onUploaded }: AttachmentInsertModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) setSelectedFile(null);
  }, [isOpen]);

  const handleClose = () => {
    if (isUploading) return;
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE) {
      alert('The file is too large. Maximum size: 10 MB');
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const [attachment] = await Promise.all([
        attachmentService.uploadAttachment(selectedFile, noteId),
        new Promise((r) => setTimeout(r, 900)),
      ]);
      onInsert({
        src: attachmentService.getAttachmentUrl(attachment.url),
        filename: attachment.filename,
        fileType: attachment.fileType,
        fileSize: attachment.fileSize,
        attachmentId: attachment.id,
      });
      onUploaded?.();
      onClose();
    } catch (error) {
      alert(getApiErrorMessage(error, 'Error uploading file. Please try again.'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Attach file"
      showFooter
      confirmLabel="Attach"
      onConfirm={handleSubmit}
      confirmDisabled={isUploading || !selectedFile}
      isConfirming={isUploading}
    >
      <div className="mb-5">
        <label className="modal-label block mb-2">Select file</label>
        <div className="flex flex-col space-y-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center justify-center space-x-2 px-4 py-6 border-2 border-dashed border-(--line) rounded-xl text-(--ink-mid) hover:border-(--accent) hover:text-(--accent) hover:bg-(--surface-hi) transition-all disabled:opacity-50"
          >
            <Upload className="w-5 h-5" />
            <span className="text-sm font-medium">{selectedFile ? 'Choose different file' : 'Select file'}</span>
          </button>
          <input ref={fileInputRef} type="file" accept={ACCEPT} onChange={handleFileSelect} className="hidden" />
          {selectedFile && (
            <div className="flex items-center justify-between px-3 py-2.5 bg-white/20 border border-white/30 rounded-lg">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <FileIcon className="w-4 h-4 text-(--accent) shrink-0" />
                <span className="text-sm text-(--ink) truncate">{selectedFile.name}</span>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                disabled={isUploading}
                className="ml-2 p-1 rounded-md transition-all disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <p className="text-xs text-(--ink-mid) text-center">Images, PDF, TXT, Word, Excel · max. 10 MB</p>
        </div>
      </div>
    </Modal>
  );
};

export default AttachmentInsertModal;
