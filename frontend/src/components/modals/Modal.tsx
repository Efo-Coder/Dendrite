import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  showFooter?: boolean;
  confirmLabel?: string;
  onConfirm?: () => void;
  confirmVariant?: 'default' | 'danger';
  confirmDisabled?: boolean;
  isConfirming?: boolean;
  confirmingLabel?: string;
}

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  showFooter = false,
  confirmLabel,
  onConfirm,
  confirmVariant = 'default',
  confirmDisabled = false,
  isConfirming = false,
  confirmingLabel = 'Loading…',
}: ModalProps) => {
  const [visible, setVisible] = useState(isOpen);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setClosing(false);
    } else if (visible) {
      setClosing(true);
      const t = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

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

  if (!visible) return null;

  return createPortal(
    <div className={`modal-overlay${closing ? ' closing' : ''}`} onClick={onClose}>
      <div className={`modal${className ? ` ${className}` : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd">
          <div className="ornament">— · {title} · —</div>
        </div>
        <div className="modal-body">{children}</div>
        {showFooter && (
          <div className="modal-ft">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            {confirmLabel && onConfirm && (
              <button
                type="button"
                onClick={onConfirm}
                disabled={confirmDisabled || isConfirming}
                className={confirmVariant === 'danger' ? 'btn danger' : 'btn primary'}
              >
                {isConfirming ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={13} className="animate-spin" />{confirmingLabel}</span> : confirmLabel}
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
