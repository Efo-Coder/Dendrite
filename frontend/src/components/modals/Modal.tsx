import { X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="relative glass-panel rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b glass-divider">
          <h2 className="text-base font-semibold text-accent-fg">{title}</h2>
          <button
            onClick={onClose}
            className="text-accent-subtle hover:text-accent-brand transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;

