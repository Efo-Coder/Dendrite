import { useState, useRef, useEffect } from 'react';
import { Upload, X, Image, Loader2 } from 'lucide-react';
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
    if (!file.type.startsWith('image/')) { alert('Bitte wähle eine Bilddatei aus.'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('Die Datei ist zu groß. Maximale Größe: 10 MB'); return; }
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
        console.error('Fehler beim Hochladen:', error);
        alert('Fehler beim Hochladen des Bildes. Bitte versuche es erneut.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Bild hinzufügen">
      <div className="flex space-x-1 -mt-2 mb-5 p-1">
        {(['url', 'upload'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setImageMode(mode)}
            disabled={isUploading}
            className={clsx(
              'flex-1 px-4 py-2 text-sm font-medium transition-all relative group disabled:opacity-50',
              imageMode === mode ? 'text-brand-primary' : 'btn-themed',
            )}
          >
            <span className="relative">{mode === 'url' ? 'URL' : 'Hochladen'}</span>
            <span className={clsx(
              'absolute bottom-0 left-0 right-0 h-0.5 transition-opacity',
              imageMode === mode
                ? 'bg-gradient-to-r from-transparent via-brand-primary to-transparent opacity-100'
                : 'bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100',
            )} />
          </button>
        ))}
      </div>

      {imageMode === 'url' && (
        <div className="mb-5">
          <label className="block text-xs font-medium text-text-primary mb-2 uppercase tracking-wide">Bild-URL</label>
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
          <label className="block text-xs font-medium text-text-primary mb-2 uppercase tracking-wide">Datei auswählen</label>
          <div className="flex flex-col space-y-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center justify-center space-x-2 px-4 py-6 border-2 border-dashed border-white/30 rounded-xl text-text-secondary hover:border-brand-primary/50 hover:text-brand-primary hover:bg-white/10 transition-all disabled:opacity-50"
            >
              <Upload className="w-5 h-5" />
              <span className="text-sm font-medium">{selectedFile ? 'Andere Datei wählen' : 'Datei auswählen'}</span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            {selectedFile && (
              <div className="flex items-center justify-between px-3 py-2.5 bg-white/20 border border-white/30 rounded-lg">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <Image className="w-4 h-4 text-brand-primary flex-shrink-0" />
                  <span className="text-sm text-text-primary truncate">{selectedFile.name}</span>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  disabled={isUploading}
                  className="ml-2 p-1 rounded-md btn-themed transition-all disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <p className="text-xs text-text-secondary text-center">JPG, PNG, GIF, WebP, SVG · max. 10 MB</p>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-2">
        <button
          onClick={handleClose}
          disabled={isUploading}
          className="px-4 py-2 text-sm btn-themed transition-all relative group disabled:opacity-50"
        >
          <span className="relative">Abbrechen</span>
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        <button
          onClick={handleSubmit}
          disabled={isUploading || (imageMode === 'url' && !imageUrl.trim()) || (imageMode === 'upload' && !selectedFile)}
          className="flex items-center space-x-2 px-4 py-2 text-sm btn-themed transition-all relative group disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isUploading && <Loader2 className="w-4 h-4 animate-spin relative" />}
          <span className="relative">{isUploading ? 'Wird hochgeladen...' : 'Hinzufügen'}</span>
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 group-disabled:opacity-0 transition-opacity" />
        </button>
      </div>
    </Modal>
  );
};

export default ImageInsertModal;
