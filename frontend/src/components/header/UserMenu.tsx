import { useLayoutEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, Settings, User } from 'lucide-react';
import { User as UserType } from '../../types';
import { useSettingsStore } from '../../store/useSettingsStore';

interface UserMenuProps {
  user: UserType | null;
  onLogout: () => void;
  onOpenSettings: () => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const UserMenu = ({ user, onLogout, onOpenSettings, onMouseEnter }: UserMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { themeMode } = useSettingsStore();

  const closeMenu = () => setIsOpen(false);

  const handleSettings = () => {
    closeMenu();
    onOpenSettings();
  };

  const handleLogout = () => {
    closeMenu();
    onLogout();
  };

  useLayoutEffect(() => {
    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const width = 224; // w-56
      const gap = 8;
      const left = Math.max(12, rect.right - width);
      const top = rect.bottom + gap;
      setMenuPosition({ top, left });
    };

    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setIsOpen((prev) => !prev)}
        onMouseEnter={onMouseEnter}
        className="flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors hover-text-themed relative z-10"
        aria-pressed={isOpen}
        type="button"
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center transition-colors">
          <User className="w-4 h-4 text-accent-subtle transition-colors" />
        </div>
        <span className="text-sm text-accent-fg font-medium">
          {user?.name || user?.email}
        </span>
      </button>

      {isOpen && (
        createPortal(
          <>
            <div className="fixed inset-0" onClick={closeMenu} />
            <div
              className={`fixed w-56 rounded-xl shadow-2xl overflow-hidden animate-fade-in ${
                themeMode === 'dark'
                  ? 'bg-slate-900 border border-white/10'
                  : 'bg-white border border-black/5'
              }`}
              style={{ top: menuPosition.top, left: menuPosition.left }}
            >
              <div className="p-3 border-b glass-divider">
                <p className="text-sm font-medium text-accent-fg">
                  {user?.name || 'Benutzer'}
                </p>
                <p className="text-xs text-accent-secondary">{user?.email}</p>
              </div>
              <div className="p-1">
                <button
                  onClick={handleSettings}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-accent-fg hover-highlight rounded-md transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Einstellungen</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-500 hover-highlight rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Abmelden</span>
                </button>
              </div>
            </div>
          </>,
          document.body
        )
      )}
    </div>
  );
};

export default UserMenu;

