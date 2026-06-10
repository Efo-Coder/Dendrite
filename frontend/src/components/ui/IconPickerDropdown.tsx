import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';
import { FOLDER_ICONS } from '../../lib/folderIcons';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import { useSmartPopupStyle, type PopupAnchor } from '../../hooks/useSmartPopupStyle';
import { useMagicHover } from '../../hooks/useMagicHover';

interface IconPickerDropdownProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

const IconPickerDropdown = ({ value, onChange }: IconPickerDropdownProps) => {
  const [anchor, setAnchor] = useState<PopupAnchor | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const { style: popupStyle, placement } = useSmartPopupStyle(anchor, popupRef, 4);

  const SelectedIcon = FOLDER_ICONS[value ?? 'Folder'];
  const { containerRef: gridRef, onItemEnter, onItemLeave, Indicator } = useMagicHover({
    mode: 'free',
    borderRadius: 8,
  });

  const close = () => setAnchor(null);

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (anchor) { close(); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchor({ x: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom, left: rect.left });
  };

  useEffect(() => {
    if (!anchor) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current?.contains(e.target as Node)) return;
      if (btnRef.current?.contains(e.target as Node)) return;
      close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [anchor]);

  const select = (name: string) => {
    onChange(value === name ? null : name);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        title={value ?? 'Select icon'}
        className={clsx(
          'w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 bg-(--surface)',
          anchor ? 'ring-2 ring-(--accent) text-(--accent)' : 'ring-1 ring-white/19 text-(--ink-mid) hover:text-(--ink) hover:bg-(--surface-hi)'
        )}
      >
        <SelectedIcon style={{ width: 14, height: 14 }} />
      </button>

      {createPortal(
        <AnimatePresence>
          {anchor && (
              <motion.div
                ref={popupRef}
                className="fixed z-7 rounded-xl border border-(--line)"
                style={{
                  ...popupStyle,
                  background: 'var(--surface)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                  transformOrigin: placement === 'above' ? 'bottom center' : 'top center',
                }}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }}
                transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
              >
                <div ref={gridRef} className="relative p-1.5 grid gap-1" style={{ gridTemplateColumns: 'repeat(12, 2rem)' }}>
                  {Indicator}
                  {Object.entries(FOLDER_ICONS).map(([name, IconComp]) => (
                    <button
                      key={name}
                      type="button"
                      title={name}
                      onClick={() => select(name)}
                      onMouseEnter={onItemEnter}
                      onMouseLeave={onItemLeave}
                      className={clsx(
                        'relative z-1 w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                        value === name
                          ? 'ring-2 ring-(--accent) text-(--accent)'
                          : 'text-(--ink-mid) hover:text-(--ink)'
                      )}
                    >
                      <IconComp style={{ width: 13, height: 13 }} />
                    </button>
                  ))}
                </div>
              </motion.div>
          )}
        </AnimatePresence>,
        getModalPortalRoot()
      )}
    </>
  );
};

export default IconPickerDropdown;
