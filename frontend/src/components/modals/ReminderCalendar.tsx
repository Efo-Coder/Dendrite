import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface ReminderCalendarProps {
  value: string; // selected day, 'YYYY-MM-DD'
  min: string; // earliest selectable day, 'YYYY-MM-DD'
  onSelect: (day: string) => void;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const pad = (n: number) => String(n).padStart(2, '0');
const dayStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

// Monday-first weekday index (JS getDay: 0=Sun) for the 1st of the given month.
function leadingBlanks(y: number, m: number): number {
  return (new Date(y, m, 1).getDay() + 6) % 7;
}

// Compact month picker for the reminder date — pure string compares keep past days
// disabled without timezone drift ('YYYY-MM-DD' sorts chronologically).
const ReminderCalendar = ({ value, min, onSelect }: ReminderCalendarProps) => {
  const [vy, setVy] = useState(() => Number(value.slice(0, 4)));
  const [vm, setVm] = useState(() => Number(value.slice(5, 7)) - 1);

  const today = (() => {
    const d = new Date();
    return dayStr(d.getFullYear(), d.getMonth(), d.getDate());
  })();

  const daysInMonth = new Date(vy, vm + 1, 0).getDate();
  const blanks = leadingBlanks(vy, vm);
  const prevDisabled = dayStr(vy, vm, 1) <= min; // no full month before min

  const step = (dir: -1 | 1) => {
    const next = vm + dir;
    if (next < 0) { setVy(vy - 1); setVm(11); }
    else if (next > 11) { setVy(vy + 1); setVm(0); }
    else setVm(next);
  };

  return (
    <div className="p-2.5" style={{ width: 248 }}>
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => !prevDisabled && step(-1)}
          disabled={prevDisabled}
          className="icon-btn-md rounded-lg shrink-0 disabled:opacity-30"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm text-(--ink)" style={{ fontFamily: 'var(--serif-display)' }}>
          {MONTHS[vm]} {vy}
        </span>
        <button type="button" onClick={() => step(1)} className="icon-btn-md rounded-lg shrink-0" aria-label="Next month">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-center text-(--ink-dim)" style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{w}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: blanks }).map((_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const ds = dayStr(vy, vm, d);
          const disabled = ds < min;
          const selected = ds === value;
          const isToday = ds === today;
          return (
            <button
              key={ds}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(ds)}
              // Selected day reuses the primary-button ink-on-gold pairing.
              style={selected ? { color: 'oklch(0.15 0.020 60)' } : undefined}
              className={clsx(
                'h-8 rounded-md text-sm transition-colors',
                disabled && 'text-(--ink-dim) opacity-40 cursor-not-allowed',
                !disabled && !selected && 'text-(--ink-mid) hover:bg-(--surface-hi) hover:text-(--ink)',
                selected && 'bg-(--accent)',
                isToday && !selected && 'text-(--accent)',
              )}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ReminderCalendar;
