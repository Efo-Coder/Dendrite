import { useState } from 'react';
import Modal from './Modal';
import { useFolderStore } from '../../store/useFolderStore';
import ColorPickerInline from '../ColorPickerInline';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderCreated?: () => void;
}

const colors = [
  '#10b981', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ef4444', // red
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#ffffff', // white
  '#000000', // black
];

const CreateFolderModal = ({ isOpen, onClose, onFolderCreated }: CreateFolderModalProps) => {
  const { createFolder } = useFolderStore();
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#10b981');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Bitte gib einen Namen ein');
      return;
    }

    setIsSubmitting(true);
    try {
      await createFolder({
        name: name.trim(),
        color: selectedColor,
      });
      setName('');
      setSelectedColor('#10b981');
      onFolderCreated?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Erstellen des Ordners');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setSelectedColor('#10b981');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Neuer Ordner">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Name Input */}
        <div>
          <label htmlFor="folder-name" className="block text-xs font-medium text-text-primary mb-2 uppercase tracking-wide">
            Name
          </label>
          <input
            id="folder-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input w-full text-sm"
            placeholder="z.B. Arbeit, Privat, Projekte"
            autoFocus
            required
          />
        </div>

        {/* Color Picker */}
        <div>
          <label className="block text-xs font-medium text-text-primary mb-2 uppercase tracking-wide">
            Farbe
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 flex-shrink-0 ${
                  selectedColor === color
                    ? 'ring-2 ring-brand-primary'
                    : 'ring-1 ring-white/20'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>

          {/* Custom Color Picker */}
          <ColorPickerInline color={selectedColor} onChange={setSelectedColor} storageKey="dendrite-tag-folder-favorites" presets={colors} />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-2">
          <button type="button" onClick={handleClose} className="btn" disabled={isSubmitting}>
            Abbrechen
          </button>
          <button type="submit" className="btn" disabled={isSubmitting}>
            {isSubmitting ? 'Erstelle...' : 'Erstellen'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateFolderModal;
