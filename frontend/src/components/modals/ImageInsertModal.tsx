import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Upload, X, Image } from 'lucide-react';
import Modal from './Modal';
import { attachmentService } from '../../services/attachment.service';
import clsx from 'clsx';

interface ImageInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (src: string, altText?: string) => void;
}

const ImageInsertModal = ({ isOpen, onClose, onInsert }: ImageInsertModalProps) => {
  const [imageUrl, setImageUrl] = useState('');
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevHeightRef = useRef<number>(0);

  const handleModeChange = (mode: 'url' | 'upload') => {
    if (contentRef.current) {
      prevHeightRef.current = contentRef.current.offsetHeight;
    }
    setImageMode(mode);
  };

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el || !prevHeightRef.current) return;
    const newHeight = el.scrollHeight;
    if (Math.abs(newHeight - prevHeightRef.current) < 2) return;

    el.style.transition = 'none';
    el.style.height = `${prevHeightRef.current}px`;
    el.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      el.style.transition = 'height .3s cubic-bezier(.2,.8,.2,1)';
      el.style.height = `${newHeight}px`;
      el.addEventListener('transitionend', () => {
        el.style.height = '';
        el.style.transition = '';
        el.style.overflow = '';
      }, { once: true });
    });
  }, [imageMode]);

  useEffect(() => {
    if (!isOpen) {
      setImageUrl('');
      setImageMode('url');
      setSelectedFile(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (isUploading) return;
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('The file is too large. Maximum size: 10 MB'); return; }
    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (imageMode === 'url' && imageUrl.trim()) {
      onInsert(imageUrl);
      onClose();
    } else if (imageMode === 'upload' && selectedFile) {
      setIsUploading(true);
      try {
        const result = await attachmentService.uploadImage(selectedFile);
        onInsert(attachmentService.getAttachmentUrl(result.url), selectedFile.name);
        onClose();
      } catch (error) {
        console.error('Upload error:', error);
        alert('Error uploading image. Please try again.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add image"
      showFooter
      confirmLabel="Add"
      onConfirm={handleSubmit}
      confirmDisabled={isUploading || (imageMode === 'url' && !imageUrl.trim()) || (imageMode === 'upload' && !selectedFile)}
      isConfirming={isUploading}
    >
      <div ref={contentRef}>
      <div className="flex space-x-1 -mt-2 mb-5 p-1">
        {(['url', 'upload'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => handleModeChange(mode)}
            disabled={isUploading}
            className={clsx(
              'flex-1 px-4 py-2 text-sm font-medium transition-all relative group disabled:opacity-50',
              imageMode === mode ? 'text-(--accent)' : 'text-(--ink-mid)',
            )}
          >
            <span className="relative">{mode === 'url' ? 'URL' : 'Upload'}</span>
            <span className={clsx(
              'absolute bottom-0 left-0 right-0 h-0.5 transition-opacity',
              imageMode === mode
                ? 'bg-linear-to-r from-transparent via-brand-primary to-transparent opacity-100'
                : 'bg-linear-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100',
            )} />
          </button>
        ))}
      </div>

      {imageMode === 'url' && (
        <div className="mb-5">
          <label className="modal-label block mb-2">Image URL</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="input w-full text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
              else if (e.key === 'Escape') handleClose();
            }}
          />
        </div>
      )}

      {imageMode === 'upload' && (
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
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            {selectedFile && (
              <div className="flex items-center justify-between px-3 py-2.5 bg-white/20 border border-white/30 rounded-lg">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <Image className="w-4 h-4 text-(--accent) shrink-0" />
                  <span className="text-sm text-(--ink) truncate">{selectedFile.name}</span>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  disabled={isUploading}
                  className="ml-2 p-1 rounded-mdtransition-all disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <p className="text-xs text-(--ink-mid) text-center">JPG, PNG, GIF, WebP, SVG · max. 10 MB</p>
          </div>
        </div>
      )}
      </div>
    </Modal>
  );
};

export default ImageInsertModal;
