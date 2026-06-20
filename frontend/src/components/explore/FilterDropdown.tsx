import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export interface FilterOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

// Compact filter select: the menu is anchored flush under the trigger (top-rounded
// button + border-t-0 menu) so they read as one shape; the chevron rotates on open.
const FilterDropdown = ({ value, options, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-32 items-center justify-between gap-2 border border-(--line) bg-(--surface) py-1.5 pl-3 pr-3.5 text-xs text-(--ink-mid) transition-colors hover:text-(--ink)"
        style={{ borderRadius: open ? '8px 8px 0 0' : '8px' }}
      >
        {current.label}
        <ChevronDown
          size={13}
          strokeWidth={1.5}
          className={clsx('shrink-0 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute left-0 top-full z-7 w-full overflow-hidden border border-t-0 border-(--line) bg-(--surface)"
            style={{ borderRadius: '0 0 8px 8px', boxShadow: '0 8px 24px rgba(0,0,0,0.18)', transformOrigin: 'center top' }}
            initial={{ opacity: 0, scaleY: 0.96, y: -4 }}
            animate={{ opacity: 1, scaleY: 1, y: 0 }}
            exit={{ opacity: 0, scaleY: 0.96, y: -4, transition: { duration: 0.1 } }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="flex flex-col p-1">
              {options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={clsx(
                    'whitespace-nowrap rounded-md px-3 py-1.5 text-left text-xs transition-colors hover:bg-(--surface-hi)',
                    o.value === value ? 'text-(--accent)' : 'text-(--ink-mid)',
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FilterDropdown;
