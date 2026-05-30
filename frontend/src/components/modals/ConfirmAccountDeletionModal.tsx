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
      title="Delete account"
      showFooter
      confirmLabel="Delete permanently"
      onConfirm={handleConfirm}
      confirmVariant="danger"
      confirmDisabled={input !== 'Delete'}
      isConfirming={isLoading}
    >
      <div className="space-y-4">
        <p className="text-sm text-(--ink-mid)">
          This action cannot be undone. All notes, folders and tags will be permanently deleted.
        </p>
        <div>
          <label className="block text-xs text-(--ink-low) mb-2">
            Type <span className="font-mono font-medium text-(--ink) pr-1 pl-1">Delete</span> to confirm
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
