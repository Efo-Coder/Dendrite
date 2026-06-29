import { useState } from 'react';
import { Check } from 'lucide-react';
import { MagicInput } from '../ui/MagicInput';
import { pad2, formatTimeLabel } from '../../lib/reminderTime';

interface ReminderTimePickerProps {
  value: string; // 'HH:mm'
  onPick: (time: string) => void;
}

interface TimeOption {
  value: string;
  label: string;
}

// Quick-pick grid in 30-minute steps; manual entry below covers anything off the grid.
const TIME_OPTIONS: TimeOption[] = (() => {
  const out: TimeOption[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      out.push({ value: `${pad2(h)}:${pad2(m)}`, label: formatTimeLabel(`${pad2(h)}:${pad2(m)}`) });
    }
  }
  return out;
})();

// Accepts "14:30", "1430", "14:5", "9" → normalised 'HH:mm', or null if out of range.
function parseTime(raw: string): string | null {
  const s = raw.trim();
  let h: number, m: number;
  let mm = s.match(/^(\d{1,2}):(\d{1,2})$/) ?? s.match(/^(\d{1,2})(\d{2})$/);
  if (mm) {
    h = Number(mm[1]);
    m = Number(mm[2]);
  } else if (/^\d{1,2}$/.test(s)) {
    h = Number(s);
    m = 0;
  } else {
    return null;
  }
  if (h > 23 || m > 59) return null;
  return `${pad2(h)}:${pad2(m)}`;
}

const scrollSelectedIntoView = (el: HTMLButtonElement | null) => el?.scrollIntoView({ block: 'nearest' });

const ReminderTimePicker = ({ value, onPick }: ReminderTimePickerProps) => {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const parsed = parseTime(search);
  const offGrid = parsed && !TIME_OPTIONS.some((o) => o.value === parsed);

  const filtered = query
    ? TIME_OPTIONS.filter((o) => o.value.includes(query) || o.label.toLowerCase().includes(query))
    : TIME_OPTIONS;

  return (
    <div className="flex flex-col p-1.5">
      <MagicInput
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && parsed) {
            e.preventDefault();
            onPick(parsed);
          }
        }}
        placeholder="e.g. 14:30"
        autoFocus
        className="w-full input border-(--line)"
        style={{
          background: 'var(--bg)', borderWidth: '0.5px', borderRadius: 8,
          padding: '8px 12px', fontFamily: 'var(--serif-display)', fontSize: 14,
          color: 'var(--ink)', transition: 'border-color .15s',
        }}
        wrapperStyle={{ borderRadius: 10 }}
      />
      <div style={{ height: '0.5px', background: 'var(--line-soft)', margin: '6px 0' }} />
      <div className="overflow-y-auto max-h-56 flex flex-col gap-0.5">
        {offGrid && (
          <TimeRow label={`${formatTimeLabel(parsed!)} · custom`} active onClick={() => onPick(parsed!)} />
        )}
        {filtered.map((o) => (
          <TimeRow key={o.value} label={o.label} active={o.value === value} onClick={() => onPick(o.value)} />
        ))}
        {filtered.length === 0 && !offGrid && (
          <p className="px-3 py-2 text-xs text-(--ink-dim)" style={{ fontFamily: 'var(--mono)' }}>No match</p>
        )}
      </div>
    </div>
  );
};

interface TimeRowProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const TimeRow = ({ label, active, onClick }: TimeRowProps) => (
  <button
    type="button"
    ref={active ? scrollSelectedIntoView : undefined}
    onClick={onClick}
    className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors hover:bg-(--surface-hi)"
    style={{ color: active ? 'var(--accent)' : 'var(--ink-mid)' }}
  >
    <span className="truncate">{label}</span>
    {active && <Check className="w-3.5 h-3.5 shrink-0" />}
  </button>
);

export default ReminderTimePicker;
