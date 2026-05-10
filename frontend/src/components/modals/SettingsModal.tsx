import clsx from 'clsx';
import Modal from './Modal';
import { useSettingsStore, DateDisplayMode, ThemeId } from '../../store/useSettingsStore';
import { themes, themeOrder } from '../../themes/themes';
import { Check } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { useGlassPill } from '../../hooks/useGlassPill';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const { dateDisplayMode, setDateDisplayMode, theme, setTheme } = useSettingsStore();

  const currentTheme = useMemo(() => themes[theme] || themes.sproutGreen, [theme]);

  const dateSectionRef = useRef<HTMLDivElement>(null);
  const themeSectionRef = useRef<HTMLDivElement>(null);
  const { pill: datePill, onEnter: onDateEnter, onLeave: onDateLeave } = useGlassPill(dateSectionRef);
  const { pill: themePill, onEnter: onThemeEnter, onLeave: onThemeLeave } = useGlassPill(themeSectionRef);

  const handleDateModeChange = (mode: DateDisplayMode) => {
    setDateDisplayMode(mode);
  };

  const handleThemeChange = (themeId: ThemeId) => {
    setTheme(themeId);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Einstellungen">
      <div className="space-y-6">
        {/* Date Display Setting */}
        <div>
          <label className="block text-xs font-medium text-text-primary mb-3 uppercase tracking-wide">
            Datumsanzeige in Notizliste
          </label>
          <div ref={dateSectionRef} className="space-y-2 relative" onMouseLeave={onDateLeave}>
            {datePill && (
              <div
                className="glass-pill"
                style={{ left: datePill.left, top: datePill.top, width: datePill.width, height: datePill.height }}
              />
            )}
            <button
              type="button"
              onClick={() => handleDateModeChange('updatedAt')}
              onMouseEnter={(e) => onDateEnter(e, dateDisplayMode === 'updatedAt')}
              className={clsx("w-full flex items-center justify-between px-4 py-3 rounded-lg backdrop-blur-md transition-all relative z-10", dateDisplayMode !== 'updatedAt' && "glass-border-box")}
              style={dateDisplayMode === 'updatedAt' ? {
                backgroundColor: `${currentTheme.colors.brandPrimary}10`,
                border: `1px solid ${currentTheme.colors.brandPrimary}80`,
                color: currentTheme.colors.brandPrimary
              } : {
                background: 'transparent',
                color: 'var(--color-text-secondary)'
              }}
            >
              <span className="text-sm font-medium">Bearbeitet am</span>
              {dateDisplayMode === 'updatedAt' && (
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentTheme.colors.brandPrimary }} />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleDateModeChange('createdAt')}
              onMouseEnter={(e) => onDateEnter(e, dateDisplayMode === 'createdAt')}
              className={clsx("w-full flex items-center justify-between px-4 py-3 rounded-lg backdrop-blur-md transition-all relative z-10", dateDisplayMode !== 'createdAt' && "glass-border-box")}
              style={dateDisplayMode === 'createdAt' ? {
                backgroundColor: `${currentTheme.colors.brandPrimary}10`,
                border: `1px solid ${currentTheme.colors.brandPrimary}80`,
                color: currentTheme.colors.brandPrimary
              } : {
                background: 'transparent',
                color: 'var(--color-text-secondary)'
              }}
            >
              <span className="text-sm font-medium">Erstellt am</span>
              {dateDisplayMode === 'createdAt' && (
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentTheme.colors.brandPrimary }} />
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-text-secondary">
            Wähle, welches Datum in der Notizliste angezeigt werden soll.
          </p>
        </div>

        {/* Theme Selection */}
        <div>
          <label className="block text-xs font-medium text-text-primary mb-3 uppercase tracking-wide">
            Farbthema
          </label>
          <div ref={themeSectionRef} className="grid grid-cols-3 gap-3 relative" onMouseLeave={onThemeLeave}>
            {themePill && (
              <div
                className="glass-pill"
                style={{ left: themePill.left, top: themePill.top, width: themePill.width, height: themePill.height }}
              />
            )}
            {themeOrder.map((themeId) => {
              const themeData = themes[themeId];
              const isSelected = theme === themeId;

              return (
                <button
                  key={themeId}
                  type="button"
                  onClick={() => handleThemeChange(themeId as ThemeId)}
                  onMouseEnter={(e) => onThemeEnter(e, isSelected)}
                  className={clsx("relative z-10 flex flex-col items-center p-3 rounded-lg backdrop-blur-md transition-all", !isSelected && "glass-border-box")}
                  style={isSelected ? {
                    backgroundColor: `${themeData.colors.brandPrimary}10`,
                    border: `1px solid ${themeData.colors.brandPrimary}80`
                  } : {
                    background: 'transparent'
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full mb-2 border-2"
                    style={{ backgroundColor: themeData.colors.brandPrimary }}
                  />
                  <span
                    className="text-xs font-medium text-center"
                    style={isSelected ? { color: themeData.colors.brandPrimary } : { color: 'var(--color-text-secondary)' }}
                  >
                    {themeData.name}
                  </span>
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-4 h-4" style={{ color: themeData.colors.brandPrimary }} />
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
      </div>
    </Modal>
  );
};

export default SettingsModal;
