import { useState } from 'react';
import { Search, User, LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useNoteStore } from '../store/useNoteStore';
import { User as UserType } from '../types';
import SettingsModal from './modals/SettingsModal';

interface HeaderProps {
  user: UserType | null;
}

const Header = ({ user }: HeaderProps) => {
  const { logout } = useAuthStore();
  const { searchNotes, fetchNotes } = useNoteStore();
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
    <header className="h-16 bg-dark-surface border-b border-dark-border px-6 flex items-center justify-between">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dark-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Notizen durchsuchen..."
            className="w-full pl-10 pr-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text-primary placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green-500 transition-all"
          />
        </div>
      </form>

      {/* User Menu */}
      <div className="relative ml-4">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-dark-elevated transition-colors"
        >
          <div className="w-8 h-8 bg-accent-green-500/10 rounded-full flex items-center justify-center border border-accent-green-500/20">
            <User className="w-4 h-4 text-accent-green-500" />
          </div>
          <span className="text-sm text-dark-text-primary font-medium">
            {user?.name || user?.email}
          </span>
        </button>

        {showUserMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowUserMenu(false)}
            />
            <div className="absolute right-0 mt-2 w-56 bg-dark-surface border border-dark-border rounded-lg shadow-2xl z-20 overflow-hidden animate-fade-in">
              <div className="p-3 border-b border-dark-border">
                <p className="text-sm font-medium text-dark-text-primary">
                  {user?.name || 'Benutzer'}
                </p>
                <p className="text-xs text-dark-text-secondary">{user?.email}</p>
              </div>
              <div className="p-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowSettingsModal(true);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-dark-text-primary hover:bg-dark-elevated rounded-md transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Einstellungen</span>
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-500 hover:bg-dark-elevated rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Abmelden</span>
                </button>
              </div>
            </div>
          </>
        )}
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
