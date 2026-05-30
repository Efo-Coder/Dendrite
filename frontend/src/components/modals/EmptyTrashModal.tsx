import Modal from './Modal';

interface EmptyTrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const EmptyTrashModal = ({ isOpen, onClose, onConfirm }: EmptyTrashModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Empty trash?"
      showFooter
      confirmLabel="Delete permanently"
      onConfirm={onConfirm}
      confirmVariant="danger"
    >
      <p className="text-sm text-(--ink-mid)">
        Are you sure you want to permanently delete all notes in the trash? This action cannot be undone.
      </p>
    </Modal>
  );
};

export default EmptyTrashModal;
