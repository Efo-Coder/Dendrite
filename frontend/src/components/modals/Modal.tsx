import { X } from 'lucide-react';
import { useEffect } from 'react';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative backdrop-blur-md border border-accent-300 rounded-xl shadow-2xl w-full max-w-md mx-4 animate-slide-up"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-100) 55%, transparent)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-accent-300">
          <h2 className="text-base font-semibold text-accent-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-accent-700 hover:bg-accent-200 hover:text-accent-900 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
