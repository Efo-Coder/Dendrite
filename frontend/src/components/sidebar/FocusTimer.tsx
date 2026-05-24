import { useState, useEffect } from 'react';
import { Sprout, Play, Pause, RotateCcw } from 'lucide-react';
import clsx from 'clsx';

interface FocusTimerProps {
  isCollapsed: boolean;
}

const FocusTimer = ({ isCollapsed }: FocusTimerProps) => {
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [timeInput, setTimeInput] = useState('25:00');

  useEffect(() => {
    if (!focusRunning) return;
    const id = window.setInterval(() => {
      setFocusSeconds((s) => {
        if (s <= 1) {
          setFocusRunning(false);
          return 25 * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [focusRunning]);

  const focusLabel = `${String(Math.floor(focusSeconds / 60)).padStart(2, '0')}:${String(focusSeconds % 60).padStart(2, '0')}`;

  return (
    <>
      {/* Expanded */}
      <div
        className={clsx(
          'mx-3 grid transition-[grid-template-rows] duration-300 ease-in-out',
          isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
        )}
        aria-hidden={isCollapsed}
      >
        <div className={clsx('min-h-0 overflow-hidden', isCollapsed && 'pointer-events-none')}>
          <div
            className="mb-2 px-4 pt-5 pb-4 rounded-2xl border border-[color-mix(in_srgb,var(--color-border-default)_55%,transparent)] flex flex-col items-center text-center gap-3"
            style={{ background: 'color-mix(in srgb, var(--color-bg-elevated) 65%, transparent)' }}
          >
            <Sprout className="w-6 h-6 text-brand-primary mt-3 -mb-1" />
            <span className="-mb-4 text-lg font-medium text-text-secondary tracking-wide">Fokuszeit</span>
            {isEditingTime ? (
              <input
                type="text"
                value={timeInput}
                onChange={(e) => {
                  let val = e.target.value.replace(/[^0-9:]/g, '');
                  if (val.includes(':')) {
                    const colonIdx = val.indexOf(':');
                    const mm = val.slice(0, colonIdx);
                    const ss = val.slice(colonIdx + 1, colonIdx + 3);
                    const ssNum = parseInt(ss, 10);
                    val = mm + ':' + (ss.length === 2 && ssNum > 59 ? '59' : ss);
                  }
                  setTimeInput(val);
                }}
                onBlur={() => {
                  const parts = timeInput.split(':');
                  let total = 0;
                  if (parts.length === 2) {
                    const secs = Math.min(parseInt(parts[1], 10) || 0, 59);
                    total = (parseInt(parts[0], 10) || 0) * 60 + secs;
                  } else {
                    total = (parseInt(parts[0], 10) || 0) * 60;
                  }
                  total = Math.max(60, Math.min(total, 99 * 60));
                  setFocusSeconds(total);
                  setTimeInput(`${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`);
                  setIsEditingTime(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  if (e.key === 'Escape') { setTimeInput(focusLabel); setIsEditingTime(false); }
                }}
                autoFocus
                className="font-display text-4xl tabular-nums text-text-primary tracking-tight bg-transparent text-center w-28 outline-none p-0 leading-[2.5rem] shadow-[0_1px_0_0_var(--color-brand-primary)]"
              />
            ) : (
              <div
                className="font-display text-4xl tabular-nums text-text-primary tracking-tight select-none cursor-pointer"
                title="Klicken zum Bearbeiten"
                onClick={() => { if (!focusRunning) { setTimeInput(focusLabel); setIsEditingTime(true); } }}
              >
                {focusLabel}
              </div>
            )}
            <div
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{ maxHeight: focusRunning ? '0px' : '60px', opacity: focusRunning ? 0 : 1 }}
            >
              <p className="text-sm text-text-secondary leading-snug">
                Starte eine Fokus-Session<br />und bleibe im Moment.
              </p>
            </div>
            <div className="w-full flex gap-2 mb-4 mt-2">
              <button
                type="button"
                onClick={() => setFocusRunning((r) => !r)}
                className="flex-1 mr-3 ml-3 h-10 rounded-full text-lg font-medium transition-all duration-300 ease-in-out bg-[color-mix(in_srgb,var(--color-brand-primary)_90%,transparent)] text-text-accent hover:bg-[color-mix(in_srgb,var(--color-brand-primary)_32%,transparent)]"
              >
                {focusRunning ? 'Pause' : 'Starten'}
              </button>
              {(focusRunning || focusSeconds !== 25 * 60) && (
                <button
                  type="button"
                  onClick={() => { setFocusRunning(false); setFocusSeconds(25 * 60); }}
                  className="h-10 w-10 flex items-center justify-center rounded-full transition-all duration-300 ease-in-out text-text-muted hover:text-text-primary border border-[color-mix(in_srgb,var(--color-border-default)_55%,transparent)] hover:border-[color-mix(in_srgb,var(--color-border-default)_80%,transparent)]"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Collapsed: Zeit + Play/Pause über dem Footer */}
      <div
        className={clsx(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          isCollapsed ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
        aria-hidden={!isCollapsed}
      >
        <div className={clsx('min-h-0 overflow-hidden', !isCollapsed && 'pointer-events-none')}>
          <div className="flex flex-col items-center gap-2 mb-2 pt-2 pb-1 border-t border-divider">
            <div className="text-lg font-medium tabular-nums text-text-primary tracking-tight leading-none">
              {focusLabel}
            </div>
            <button
              type="button"
              onClick={() => setFocusRunning((r) => !r)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-text-accent transition-all duration-300 ease-in-out bg-brand-primary hover:bg-[color-mix(in_srgb,var(--color-brand-primary)_32%,transparent)]"
              title={focusRunning ? 'Pause' : 'Starten'}
              aria-label={focusRunning ? 'Pause' : 'Starten'}
            >
              {focusRunning ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FocusTimer;
