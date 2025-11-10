import { useState } from 'react';
import { Search, User, LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useNoteStore } from '../store/useNoteStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { User as UserType } from '../types';
import SettingsModal from './modals/SettingsModal';
import DarkModeToggle from './DarkModeToggle';

interface HeaderProps {
  user: UserType | null;
}

const Header = ({ user }: HeaderProps) => {
  const { logout } = useAuthStore();
  const { searchNotes, fetchNotes } = useNoteStore();
  const { themeMode } = useSettingsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      await searchNotes(searchQuery);
    } else {
      await fetchNotes();
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (!value.trim()) {
      fetchNotes();
    }
  };

  return (
    <header className="h-16 bg-theme-surface border-b border-theme px-6 flex items-center justify-between">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-theme-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Notizen durchsuchen..."
            className="w-full pl-10 pr-4 py-2 bg-theme-bg border border-theme rounded-lg text-theme-text-primary placeholder-theme-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all"
          />
        </div>
      </form>

      {/* Dark Mode Toggle & User Menu */}
      <div className="flex items-center gap-2 ml-4">
        <DarkModeToggle />

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors group"
          >
            <div className="w-8 h-8 bg-accent-500/10 rounded-full flex items-center justify-center border border-accent-500/20 group-hover:bg-theme-elevated transition-colors">
              <User className={`w-4 h-4 ${themeMode === 'dark' ? 'text-accent-500' : 'text-theme-text-primary'}`} />
            </div>
            <span className="text-sm text-theme-text-primary font-medium group-hover:underline">
              {user?.name || user?.email}
            </span>
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-theme-surface border border-theme rounded-lg shadow-2xl z-20 overflow-hidden animate-fade-in">
                <div className="p-3 border-b border-theme">
                  <p className="text-sm font-medium text-theme-text-primary">
                    {user?.name || 'Benutzer'}
                  </p>
                  <p className="text-xs text-theme-text-secondary">{user?.email}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowSettingsModal(true);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-theme-text-primary hover:bg-theme-elevated rounded-md transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Einstellungen</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-500 hover:bg-theme-elevated rounded-md transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Abmelden</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </header>
  );
};

export default Header;
