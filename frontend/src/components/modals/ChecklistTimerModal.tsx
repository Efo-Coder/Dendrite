import { useState, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';
import clsx from 'clsx';
import Modal from './Modal';
import Counter from '../ui/Counter';
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'center',
  background: 'transparent',
  border: 'none',
  outline: 'none',
  fontFamily: 'var(--mono)',
  fontSize: 20,
  lineHeight: 1,
  color: 'var(--ink)',
  padding: 0,
  verticalAlign: 'middle',
};

const ChecklistTimerModal = ({
  isOpen, onClose,
  countdownHours, setCountdownHours,
  countdownMinutes, setCountdownMinutes,
  existingTimer,
  onSave, onRemove,
}: ChecklistTimerModalProps) => {
  const canSave = countdownHours > 0 || countdownMinutes > 0;

  const [editingHours, setEditingHours] = useState(false);
  const [editingMinutes, setEditingMinutes] = useState(false);
  const [hoursInput, setHoursInput] = useState('');
  const [minutesInput, setMinutesInput] = useState('');
  const hoursRef = useRef<HTMLInputElement>(null);
  const minutesRef = useRef<HTMLInputElement>(null);

  const commitHours = (raw: string) => {
    const parsed = parseInt(raw, 10);
    const clamped = isNaN(parsed) ? countdownHours : Math.min(24, Math.max(0, parsed));
    setCountdownHours(clamped);
    if (clamped === 24) setCountdownMinutes(0);
    setEditingHours(false);
  };

  const commitMinutes = (raw: string) => {
    const parsed = parseInt(raw, 10);
    const max = countdownHours >= 24 ? 0 : 59;
    const clamped = isNaN(parsed) ? countdownMinutes : Math.min(max, Math.max(0, parsed));
    setCountdownMinutes(clamped);
    setEditingMinutes(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Auto-Reset Timer">
        <div>
          <label className="modal-label">In</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="input flex items-center gap-1 px-2">
                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setCountdownHours(Math.max(0, countdownHours - 1))} className="transition-colors shrink-0"><Minus className="w-3 h-3" /></button>
                <span
                  className="flex-1 flex justify-center cursor-text"
                  style={{ height: 28, alignItems: 'center' }}
                  onClick={() => { setHoursInput(String(countdownHours)); setEditingHours(true); setTimeout(() => { hoursRef.current?.select(); }, 0); }}
                >
                  {editingHours ? (
                    <input
                      ref={hoursRef}
                      type="text"
                      inputMode="numeric"
                      value={hoursInput}
                      style={inputStyle}
                      onChange={e => setHoursInput(e.target.value)}
                      onBlur={() => commitHours(hoursInput)}
                      onKeyDown={e => { if (e.key === 'Enter') commitHours(hoursInput); if (e.key === 'Escape') setEditingHours(false); }}
                      autoFocus
                    />
                  ) : (
                    <Counter value={countdownHours} places={[10, 1]} fontSize={20} gap={0} borderRadius={0} horizontalPadding={0} textColor="var(--ink)" fontWeight={400} gradientHeight={4} gradientFrom="var(--surface)" gradientTo="transparent" counterStyle={{ fontFamily: 'var(--mono)' }} />
                  )}
                </span>
                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { const next = Math.min(24, countdownHours + 1); setCountdownHours(next); if (next === 24) setCountdownMinutes(0); }} className="transition-colors shrink-0"><Plus className="w-3 h-3" /></button>
              </div>
              <div className="text-[10px] text-(--ink-mid) text-center mt-1">hrs</div>
            </div>
            <div className="flex-1">
              <div className="input flex items-center gap-1 px-2">
                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setCountdownMinutes(Math.max(0, countdownMinutes - 1))} className="transition-colors shrink-0"><Minus className="w-3 h-3" /></button>
                <span
                  className="flex-1 flex justify-center cursor-text"
                  style={{ height: 28, alignItems: 'center' }}
                  onClick={() => { if (countdownHours >= 24) return; setMinutesInput(String(countdownMinutes)); setEditingMinutes(true); setTimeout(() => { minutesRef.current?.select(); }, 0); }}
                >
                  {editingMinutes ? (
                    <input
                      ref={minutesRef}
                      type="text"
                      inputMode="numeric"
                      value={minutesInput}
                      style={inputStyle}
                      onChange={e => setMinutesInput(e.target.value)}
                      onBlur={() => commitMinutes(minutesInput)}
                      onKeyDown={e => { if (e.key === 'Enter') commitMinutes(minutesInput); if (e.key === 'Escape') setEditingMinutes(false); }}
                      autoFocus
                    />
                  ) : (
                    <Counter value={countdownMinutes} places={[10, 1]} fontSize={20} gap={0} borderRadius={0} horizontalPadding={0} textColor="var(--ink)" fontWeight={400} gradientHeight={4} gradientFrom="var(--surface)" gradientTo="transparent" counterStyle={{ fontFamily: 'var(--mono)' }} />
                  )}
                </span>
                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { if (countdownHours < 24) setCountdownMinutes(Math.min(59, countdownMinutes + 1)); }} className="transition-colors shrink-0"><Plus className="w-3 h-3" /></button>
              </div>
              <div className="text-[10px] text-(--ink-mid) text-center mt-1">min</div>
            </div>
          </div>
        </div>

      <div className="modal-form-ft">
          {existingTimer && (
            <button type="button" onClick={onRemove} className="btn-ghost mr-auto" style={{ color: '#ef4444' }}>Remove</button>
          )}
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button
            type="button"
            onClick={canSave ? onSave : undefined}
            className={clsx('btn primary', !canSave && 'opacity-45 pointer-events-none')}
          >
            Save
          </button>
        </div>
    </Modal>
  );
};

export default ChecklistTimerModal;
