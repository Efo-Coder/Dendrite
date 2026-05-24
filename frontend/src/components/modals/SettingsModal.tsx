import clsx from 'clsx';
import Modal from './Modal';
import { useSettingsStore, DateDisplayMode, ThemeId } from '../../store/useSettingsStore';
import { themes, themeOrder } from '../../themes/themes';
import { Check, Sprout } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { useGlassPill } from '../../hooks/useGlassPill';
import { motion } from 'motion/react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const { dateDisplayMode, setDateDisplayMode, theme, setTheme, showFocusTimer, setShowFocusTimer } = useSettingsStore();

  const currentTheme = useMemo(() => themes[theme] || themes.sproutGreen, [theme]);

  const dateSectionRef = useRef<HTMLDivElement>(null);
  const themeSectionRef = useRef<HTMLDivElement>(null);
  const { pill: datePill, onEnter: onDateEnter, onLeave: onDateLeave } = useGlassPill(dateSectionRef);
  const { pill: themePill, onEnter: onThemeEnter, onLeave: onThemeLeave } = useGlassPill(themeSectionRef);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Einstellungen">
        <div className="space-y-6">
          {/* Datumsanzeige */}
          <div>
            <label className="block text-xs font-medium text-text-primary mb-3 uppercase tracking-wide">
              Datumsanzeige in Notizliste
            </label>
            <div ref={dateSectionRef} className="space-y-2 relative" onMouseLeave={onDateLeave}>
              {datePill && (
                <div
                  className="glass-pill"
                  style={{ left: datePill.left, top: datePill.top, width: datePill.width, height: datePill.height, opacity: datePill.visible ? 1 : 0 }}
                />
              )}
              <button
                type="button"
                onClick={() => setDateDisplayMode('updatedAt' as DateDisplayMode)}
                onMouseEnter={(e) => onDateEnter(e, dateDisplayMode === 'updatedAt')}
                className={clsx('w-full flex items-center justify-between px-4 py-3 rounded-lg backdrop-blur-md transition-all relative z-10', dateDisplayMode !== 'updatedAt' && 'glass-border-box')}
                style={dateDisplayMode === 'updatedAt' ? {
                  backgroundColor: `${currentTheme.colors.brandPrimary}50`,
                  border: `1px solid ${currentTheme.colors.brandPrimary}80`,
                  color: 'var(--color-text-secondary)',
                } : { background: 'transparent', color: 'var(--color-text-secondary)' }}
              >
                <span className="text-sm font-medium">Bearbeitet am</span>
                <motion.div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: 'var(--color-text-secondary)' }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: dateDisplayMode === 'updatedAt' ? 1 : 0, scale: dateDisplayMode === 'updatedAt' ? 1 : 0 }}
                  transition={{ duration: 0.4, scale: { type: 'spring', visualDuration: 0.4, bounce: 0.5 } }}
                />
              </button>
              <button
                type="button"
                onClick={() => setDateDisplayMode('createdAt' as DateDisplayMode)}
                onMouseEnter={(e) => onDateEnter(e, dateDisplayMode === 'createdAt')}
                className={clsx('w-full flex items-center justify-between px-4 py-3 rounded-lg backdrop-blur-md transition-all relative z-10', dateDisplayMode !== 'createdAt' && 'glass-border-box')}
                style={dateDisplayMode === 'createdAt' ? {
                  backgroundColor: `${currentTheme.colors.brandPrimary}50`,
                  border: `1px solid ${currentTheme.colors.brandPrimary}80`,
                  color: 'var(--color-text-secondary)',
                } : { background: 'transparent', color: 'var(--color-text-secondary)' }}
              >
                <span className="text-sm font-medium">Erstellt am</span>
                <motion.div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: 'var(--color-text-secondary)' }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: dateDisplayMode === 'createdAt' ? 1 : 0, scale: dateDisplayMode === 'createdAt' ? 1 : 0 }}
                  transition={{ duration: 0.4, scale: { type: 'spring', visualDuration: 0.4, bounce: 0.5 } }}
                />
              </button>
            </div>
            <p className="mt-2 text-xs text-text-secondary">
              Wähle, welches Datum in der Notizliste angezeigt werden soll.
            </p>
          </div>

          {/* Farbthema */}
          <div>
            <label className="block text-xs font-medium text-text-primary mb-3 uppercase tracking-wide">
              Farbthema
            </label>
            <div ref={themeSectionRef} className="grid grid-cols-3 gap-3 relative" onMouseLeave={onThemeLeave}>
              {themePill && (
                <div
                  className="glass-pill"
                  style={{ left: themePill.left, top: themePill.top, width: themePill.width, height: themePill.height, opacity: themePill.visible ? 1 : 0 }}
                />
              )}
              {themeOrder.map((themeId) => {
                const themeData = themes[themeId];
                const isSelected = theme === themeId;
                return (
                  <button
                    key={themeId}
                    type="button"
                    onClick={() => setTheme(themeId as ThemeId)}
                    onMouseEnter={(e) => onThemeEnter(e, isSelected)}
                    className={clsx('relative z-10 flex flex-col items-center p-3 rounded-lg backdrop-blur-md transition-all', !isSelected && 'glass-border-box')}
                    style={isSelected ? {
                      backgroundColor: `${themeData.colors.textSecondary}40`,
                      border: `1px solid ${themeData.colors.borderDefault}`,
                    } : { background: 'transparent' }}
                  >
                    <div className="w-10 h-10 rounded-full mb-2 border-2" style={{ backgroundColor: themeData.colors.brandPrimary }} />
                    <span
                      className="text-xs font-medium text-center"
                      style={isSelected ? { color: 'var(--color-text-primary)' } : { color: 'var(--color-text-secondary)' }}
                    >
                      {themeData.name}
                    </span>
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-4 h-4" style={{ color: 'var(--color-text-primary)' }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-text-secondary">
              Wähle ein Farbthema für die gesamte Anwendung.
            </p>
          </div>

          {/* Fokuszeit */}
          <div>
            <label className="block text-xs font-medium text-text-primary mb-3 uppercase tracking-wide">
              Ansicht
            </label>
            <button
              type="button"
              onClick={() => setShowFocusTimer(!showFocusTimer)}
              className={clsx('no-press w-full flex items-center justify-between px-4 py-3 rounded-lg backdrop-blur-md transition-all', showFocusTimer ? '' : 'glass-border-box')}
              style={showFocusTimer ? {
                backgroundColor: `${currentTheme.colors.brandPrimary}10`,
                border: `1px solid ${currentTheme.colors.brandPrimary}80`,
              } : { background: 'transparent' }}
            >
              <div className="flex items-center gap-3">
                <Sprout className="w-4 h-4" style={{ color: showFocusTimer ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }} />
                <span className="text-sm font-medium" style={{ color: showFocusTimer ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
                  Fokuszeit anzeigen
                </span>
              </div>
              <div
                className="flex-shrink-0 flex items-center rounded-full p-[3px]"
                style={{
                  width: 44,
                  height: 24,
                  backgroundColor: showFocusTimer ? currentTheme.colors.brandPrimary : 'color-mix(in srgb, var(--color-text-primary) 15%, transparent)',
                  justifyContent: showFocusTimer ? 'flex-end' : 'flex-start',
                  transition: 'background-color 0.2s ease',
                }}
              >
                <motion.div
                  layout
                  transition={{ type: 'spring', visualDuration: 0.2, bounce: 0.2 }}
                  style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: 'white' }}
                />
              </div>
            </button>
          </div>
        </div>
    </Modal>
  );
};

export default SettingsModal;
