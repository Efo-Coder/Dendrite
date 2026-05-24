import { X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';

const cancelClass = 'btn';

const confirmDefaultClass = 'btn';

const confirmDangerClass = 'btn hover:text-red-400';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  showFooter?: boolean;
  confirmLabel?: string;
  onConfirm?: () => void;
  confirmVariant?: 'default' | 'danger';
  confirmDisabled?: boolean;
  isConfirming?: boolean;
}

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  showFooter = false,
  confirmLabel,
  onConfirm,
  confirmVariant = 'default',
  confirmDisabled = false,
  isConfirming = false,
}: ModalProps) => {
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

      <div className="relative glass-popup rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-black/15 glass-divider !bg-transparent">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className={showFooter ? 'px-6 pt-6 pb-2' : 'p-6'}>{children}</div>

        {showFooter && (
          <div className="flex justify-end gap-2 px-6 pb-6">
            <button onClick={onClose} className={cancelClass}>
              Abbrechen
            </button>
            {confirmLabel && onConfirm && (
              <button
                onClick={onConfirm}
                disabled={confirmDisabled || isConfirming}
                className={confirmVariant === 'danger' ? confirmDangerClass : confirmDefaultClass}
              >
                {isConfirming ? 'Lädt...' : confirmLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    getModalPortalRoot()
  );
};

export default Modal;
