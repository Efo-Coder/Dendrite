import Modal from './Modal';
import { useSettingsStore, DateDisplayMode, ThemeId } from '../../store/useSettingsStore';
import { themes, themeOrder } from '../../themes/themes';
import { Check } from 'lucide-react';
import { useMemo } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const { dateDisplayMode, setDateDisplayMode, theme, setTheme } = useSettingsStore();

  const currentTheme = useMemo(() => themes[theme], [theme]);

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
          <label className="block text-xs font-medium text-theme-text-primary mb-3 uppercase tracking-wide">
            Datumsanzeige in Notizliste
          </label>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleDateModeChange('updatedAt')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg backdrop-blur-md transition-all relative group"
              style={dateDisplayMode === 'updatedAt' ? {
                backgroundColor: `${currentTheme.colors.accent500}10`,
                border: `1px solid ${currentTheme.colors.accent500}80`,
                color: currentTheme.colors.accent500
              } : {
                backgroundColor: 'rgba(100, 100, 100, 0.3)',
                border: '1px solid rgba(140, 140, 140, 0.5)',
                color: 'var(--color-text-secondary)'
              }}
            >
              <span className="text-sm font-medium relative z-10">Bearbeitet am</span>
              {dateDisplayMode === 'updatedAt' ? (
                <div className="w-2 h-2 rounded-full relative z-10" style={{ backgroundColor: currentTheme.colors.accent500 }} />
              ) : (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleDateModeChange('createdAt')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg backdrop-blur-md transition-all relative group"
              style={dateDisplayMode === 'createdAt' ? {
                backgroundColor: `${currentTheme.colors.accent500}10`,
                border: `1px solid ${currentTheme.colors.accent500}80`,
                color: currentTheme.colors.accent500
              } : {
                backgroundColor: 'rgba(100, 100, 100, 0.3)',
                border: '1px solid rgba(140, 140, 140, 0.5)',
                color: 'var(--color-text-secondary)'
              }}
            >
              <span className="text-sm font-medium relative z-10">Erstellt am</span>
              {dateDisplayMode === 'createdAt' ? (
                <div className="w-2 h-2 rounded-full relative z-10" style={{ backgroundColor: currentTheme.colors.accent500 }} />
              ) : (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-theme-text-muted">
            Wähle, welches Datum in der Notizliste angezeigt werden soll.
          </p>
        </div>

        {/* Theme Selection */}
        <div>
          <label className="block text-xs font-medium text-theme-text-primary mb-3 uppercase tracking-wide">
            Farbthema
          </label>
          <div className="grid grid-cols-3 gap-3">
            {themeOrder.map((themeId) => {
              const themeData = themes[themeId];
              const isSelected = theme === themeId;

              return (
                <button
                  key={themeId}
                  type="button"
                  onClick={() => handleThemeChange(themeId as ThemeId)}
                  className="relative flex flex-col items-center p-3 rounded-lg backdrop-blur-md transition-all group"
                  style={isSelected ? {
                    backgroundColor: `${themeData.colors.accent500}10`,
                    border: `1px solid ${themeData.colors.accent500}80`
                  } : {
                    backgroundColor: 'rgba(100, 100, 100, 0.3)',
                    border: '1px solid rgba(140, 140, 140, 0.5)'
                  }}
                >
                  {/* Color Preview Circle */}
                  <div
                    className="w-10 h-10 rounded-full mb-2 border-2"
                    style={{ backgroundColor: themeData.colors.accent200 }}
                  />

                  {/* Theme Name */}
                  <span
                    className={`text-xs font-medium text-center`}
                    style={isSelected ? { color: themeData.colors.accent500 } : { color: 'var(--color-text-secondary)' }}
                  >
                    {themeData.name}
                  </span>

                  {/* Check Icon */}
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-4 h-4" style={{ color: themeData.colors.accent500 }} />
                    </div>
                  )}

                  {/* Hover Glow Effect */}
                  {!isSelected && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-theme-text-muted">
            Wähle ein Farbthema für die gesamte Anwendung.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
