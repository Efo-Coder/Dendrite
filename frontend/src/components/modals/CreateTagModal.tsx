import { useState } from 'react';
import Modal from './Modal';
import { useTagStore } from '../../store/useTagStore';

interface CreateTagModalProps {
  isOpen: boolean;
  onClose: () => void;
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
];

const CreateTagModal = ({ isOpen, onClose }: CreateTagModalProps) => {
  const { createTag } = useTagStore();
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
      await createTag({
        name: name.trim(),
        color: selectedColor,
      });
      setName('');
      setSelectedColor('#10b981');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Erstellen des Tags');
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Neuer Tag">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Name Input */}
        <div>
          <label htmlFor="tag-name" className="block text-sm font-medium text-dark-text-primary mb-2">
            Name
          </label>
          <input
            id="tag-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="z.B. Wichtig, Idee, ToDo"
            autoFocus
            required
          />
        </div>

        {/* Color Picker */}
        <div>
          <label className="block text-sm font-medium text-dark-text-primary mb-2">
            Farbe
          </label>
          <div className="grid grid-cols-8 gap-2 mb-3">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`w-8 h-8 rounded-lg transition-all ${
                  selectedColor === color
                    ? 'ring-2 ring-offset-2 ring-offset-dark-surface ring-accent-green-500 scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>

          {/* Custom Color Picker */}
          <div className="flex items-center gap-3">
            <label htmlFor="custom-color" className="text-sm text-dark-text-secondary">
              Oder eigene Farbe:
            </label>
            <div className="flex items-center gap-2">
              <input
                id="custom-color"
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border-2 border-dark-border bg-dark-elevated"
                title="Eigene Farbe wählen"
              />
              <span className="text-xs text-dark-text-muted font-mono">
                {selectedColor}
              </span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary"
            disabled={isSubmitting}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Erstelle...' : 'Erstellen'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTagModal;
