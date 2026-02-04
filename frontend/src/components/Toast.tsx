import { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

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

  const icons = {
    success: <CheckCircle2 className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
  };

  const colors = {
    success: 'bg-green-500/10 border-green-500/20 text-green-500',
    error: 'bg-red-500/10 border-red-500/20 text-red-500',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
    warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500',
  };

  const progressColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500',
  };

  return (
    <div
      className={clsx(
        'relative flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-lg',
        'min-w-[320px] max-w-md',
        colors[type],
        isLeaving ? 'animate-slide-out' : 'animate-slide-in'
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0 pt-0.5">{icons[type]}</div>

      {/* Message */}
      <div className="flex-1 text-sm font-medium pr-8">{message}</div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="absolute top-3 right-3 p-1 rounded-lg hover-highlight transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-lg overflow-hidden">
        <div
          className={clsx('h-full w-full', progressColors[type])}
          style={{
            animation: `progressBar ${duration}ms linear forwards`
          }}
        />
      </div>
    </div>
  );
};

export default Toast;

