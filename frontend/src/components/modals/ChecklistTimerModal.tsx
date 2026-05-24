import { Minus, Plus } from 'lucide-react';
import clsx from 'clsx';
import Modal from './Modal';
import type { ResetTimer } from '../../store/useCheckResetStore';

interface ChecklistTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  countdownHours: number;
  setCountdownHours: (h: number) => void;
  countdownMinutes: number;
  setCountdownMinutes: (m: number) => void;
  existingTimer: ResetTimer | undefined;
  onSave: () => void;
  onRemove: () => void;
}

const ChecklistTimerModal = ({
  isOpen, onClose,
  countdownHours, setCountdownHours,
  countdownMinutes, setCountdownMinutes,
  existingTimer,
  onSave, onRemove,
}: ChecklistTimerModalProps) => {
  const canSave = countdownHours > 0 || countdownMinutes > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Auto-Reset Timer">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-primary mb-2 uppercase tracking-wide">In</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="input flex items-center gap-1 px-2">
                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setCountdownHours(Math.max(0, countdownHours - 1))} className="transition-colors flex-shrink-0"><Minus className="w-3 h-3" /></button>
                <span className="flex-1 text-center text-sm tabular-nums font-ui">{countdownHours}</span>
                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setCountdownHours(Math.min(99, countdownHours + 1))} className="transition-colors flex-shrink-0"><Plus className="w-3 h-3" /></button>
              </div>
              <div className="text-[10px] text-text-secondary text-center mt-1">Std</div>
            </div>
            <div className="flex-1">
              <div className="input flex items-center gap-1 px-2">
                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setCountdownMinutes(Math.max(0, countdownMinutes - 1))} className="transition-colors flex-shrink-0"><Minus className="w-3 h-3" /></button>
                <span className="flex-1 text-center text-sm tabular-nums font-ui">{countdownMinutes}</span>
                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setCountdownMinutes(Math.min(59, countdownMinutes + 1))} className="transition-colors flex-shrink-0"><Plus className="w-3 h-3" /></button>
              </div>
              <div className="text-[10px] text-text-secondary text-center mt-1">Min</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          {existingTimer && (
            <button type="button" onClick={onRemove} className="btn mr-auto" style={{ color: '#ef4444' }}>Entfernen</button>
          )}
          <button type="button" onClick={onClose} className="btn">Abbrechen</button>
          <button
            type="button"
            onClick={canSave ? onSave : undefined}
            className={clsx('btn', !canSave && 'text-text-muted pointer-events-none')}
          >
            Speichern
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ChecklistTimerModal;
