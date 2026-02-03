import { useState } from 'react';
import { LogOut, Settings, User } from 'lucide-react';
import { User as UserType } from '../../types';

interface UserMenuProps {
  user: UserType | null;
  onLogout: () => void;
  onOpenSettings: () => void;
}

const UserMenu = ({ user, onLogout, onOpenSettings }: UserMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  const handleSettings = () => {
    closeMenu();
    onOpenSettings();
  };

  const handleLogout = () => {
    closeMenu();
    onLogout();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors group"
      >
        <div className="w-8 h-8 bg-accent-500/10 rounded-full flex items-center justify-center border border-accent-300 group-hover:bg-accent-200 transition-colors">
          <User className="w-4 h-4 text-theme-icon" />
        </div>
        <span className="text-sm text-accent-900 font-medium group-hover:underline">
          {user?.name || user?.email}
        </span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={closeMenu} />
          <div className="absolute right-0 mt-2 w-56 bg-accent-100 border border-accent-300 rounded-lg shadow-2xl z-20 overflow-hidden animate-fade-in">
            <div className="p-3 border-b border-accent-300">
              <p className="text-sm font-medium text-accent-900">
                {user?.name || 'Benutzer'}
              </p>
              <p className="text-xs text-accent-800">{user?.email}</p>
            </div>
            <div className="p-1">
              <button
                onClick={handleSettings}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-accent-900 hover:bg-accent-200 rounded-md transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Einstellungen</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-500 hover:bg-accent-200 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Abmelden</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserMenu;
