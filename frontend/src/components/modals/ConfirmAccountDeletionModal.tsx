import { useState } from 'react';
import Modal from './Modal';

interface ConfirmAccountDeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

const ConfirmAccountDeletionModal = ({ isOpen, onClose, onConfirm, isLoading }: ConfirmAccountDeletionModalProps) => {
  const [input, setInput] = useState('');

  const handleClose = () => {
    setInput('');
    onClose();
  };

  const handleConfirm = () => {
    onConfirm();
    setInput('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Konto löschen"
      showFooter
      confirmLabel="Endgültig löschen"
      onConfirm={handleConfirm}
      confirmVariant="danger"
      confirmDisabled={input !== 'Delete'}
      isConfirming={isLoading}
    >
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Diese Aktion kann nicht rückgängig gemacht werden. Alle Notizen, Ordner und Tags werden permanent gelöscht.
        </p>
        <div>
          <label className="block text-xs text-text-muted mb-2">
            Gib <span className="font-mono font-medium text-text-primary">Delete</span> ein um zu bestätigen
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="input w-full"
            placeholder="Delete"
            autoFocus
          />
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmAccountDeletionModal;
