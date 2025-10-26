import Modal from './Modal';
import { useSettingsStore, DateDisplayMode, ThemeId } from '../../store/useSettingsStore';
import { themes, themeOrder } from '../../themes/themes';
import { Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const { dateDisplayMode, setDateDisplayMode, theme, setTheme } = useSettingsStore();

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
          <label className="block text-sm font-medium text-dark-text-primary mb-3">
            Datumsanzeige in Notizliste
          </label>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleDateModeChange('updatedAt')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                dateDisplayMode === 'updatedAt'
                  ? 'bg-accent-green-500/10 border-accent-green-500 text-accent-green-500'
                  : 'bg-dark-elevated border-dark-border text-dark-text-secondary hover:bg-dark-elevated/80 hover:text-dark-text-primary'
              }`}
            >
              <span className="text-sm font-medium">Bearbeitet am</span>
              {dateDisplayMode === 'updatedAt' && (
                <div className="w-2 h-2 rounded-full bg-accent-green-500" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleDateModeChange('createdAt')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                dateDisplayMode === 'createdAt'
                  ? 'bg-accent-green-500/10 border-accent-green-500 text-accent-green-500'
                  : 'bg-dark-elevated border-dark-border text-dark-text-secondary hover:bg-dark-elevated/80 hover:text-dark-text-primary'
              }`}
            >
              <span className="text-sm font-medium">Erstellt am</span>
              {dateDisplayMode === 'createdAt' && (
                <div className="w-2 h-2 rounded-full bg-accent-green-500" />
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-dark-text-muted">
            Wähle, welches Datum in der Notizliste angezeigt werden soll.
          </p>
        </div>

        {/* Theme Selection */}
        <div>
          <label className="block text-sm font-medium text-dark-text-primary mb-3">
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
                  className={`relative flex flex-col items-center p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-accent-green-500 bg-accent-green-500/10'
                      : 'border-dark-border bg-dark-elevated hover:bg-dark-elevated/80'
                  }`}
                >
                  {/* Color Preview Circle */}
                  <div
                    className="w-10 h-10 rounded-full mb-2 border-2 border-dark-border"
                    style={{ backgroundColor: themeData.colors.accent500 }}
                  />

                  {/* Theme Name */}
                  <span className={`text-xs font-medium text-center ${
                    isSelected ? 'text-accent-green-500' : 'text-dark-text-secondary'
                  }`}>
                    {themeData.name}
                  </span>

                  {/* Check Icon */}
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-4 h-4 text-accent-green-500" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-dark-text-muted">
            Wähle ein Farbthema für die gesamte Anwendung.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
