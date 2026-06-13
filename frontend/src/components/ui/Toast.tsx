import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

// Tone colors come 1:1 from the Dendrite design system. success/warning are
// literal oklch because there are no --success/--warning tokens in the theme.
const TONES: Record<ToastType, { color: string; icon: string }> = {
  success: { color: 'oklch(0.72 0.15 150)', icon: '✓' },
  error: { color: 'var(--danger)', icon: '!' },
  info: { color: 'var(--accent)', icon: 'i' },
  warning: { color: 'oklch(0.80 0.13 80)', icon: '!' },
};

const Toast = ({ id, type, message, duration = 3000, onClose }: ToastProps) => {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Auto-close timer
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => onClose(id), 300);
  };

  const tone = TONES[type];

  return (
    <div
      role="status"
      className={clsx(
        'relative flex items-start gap-3 overflow-hidden',
        isLeaving ? 'animate-slide-out' : 'animate-slide-in'
      )}
      style={{
        minWidth: 300,
        maxWidth: 420,
        padding: '14px 16px',
        borderRadius: 'var(--radius-win)',
        background: 'color-mix(in srgb, var(--surface) 88%, transparent)',
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        border: '0.5px solid var(--line)',
        boxShadow: 'var(--shadow-deep)',
        color: 'var(--ink)',
      }}
    >
      {/* Leading tone dot */}
      <span
        className="shrink-0 inline-flex items-center justify-center"
        style={{
          width: 18,
          height: 18,
          marginTop: 1,
          borderRadius: '50%',
          background: `color-mix(in srgb, ${tone.color} 18%, transparent)`,
          color: tone.color,
          fontFamily: 'var(--mono)',
          fontSize: 10,
          fontWeight: 600,
        }}
      >
        {tone.icon}
      </span>

      {/* Message */}
      <div
        className="flex-1"
        style={{ fontFamily: 'var(--serif-body)', fontSize: 14.5, lineHeight: 1.45, paddingRight: 16 }}
      >
        {message}
      </div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        aria-label="Dismiss"
        className="absolute top-1/2 right-3 -translate-y-1/2 text-(--ink-low) hover:text-(--ink) transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Progress Bar */}
      <span
        className="absolute left-0 bottom-0 w-full"
        style={{
          height: 2,
          background: tone.color,
          opacity: 0.5,
          transformOrigin: 'left',
          willChange: 'transform',
          animation: `progressBar ${duration}ms linear forwards`,
        }}
      />
    </div>
  );
};

export default Toast;
