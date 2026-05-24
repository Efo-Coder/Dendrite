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
      title="Papierkorb leeren?"
      showFooter
      confirmLabel="Endgültig löschen"
      onConfirm={onConfirm}
      confirmVariant="danger"
    >
      <p className="text-sm text-text-secondary">
        Möchtest du wirklich alle Notizen im Papierkorb endgültig löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.
      </p>
    </Modal>
  );
};

export default EmptyTrashModal;
