import { useState } from 'react';
import { Search } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useNoteStore } from '../../store/useNoteStore';
import { User as UserType } from '../../types';
import SettingsModal from '../modals/SettingsModal';
import DarkModeToggle from './DarkModeToggle';
import UserMenu from './UserMenu';

interface HeaderProps {
  user: UserType | null;
}

const Header = ({ user }: HeaderProps) => {
  const { logout } = useAuthStore();
  const { searchNotes, fetchNotes } = useNoteStore();
  const [searchQuery, setSearchQuery] = useState('');
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
    <header className="h-16 bg-accent-100 border-b border-accent-300 px-6 flex items-center justify-between">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-accent-700" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Notizen durchsuchen..."
            className="w-full pl-10 pr-4 py-2 bg-accent-50 border border-accent-300 rounded-lg text-accent-900 placeholder:text-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all"
          />
        </div>
      </form>

      {/* Dark Mode Toggle & User Menu */}
      <div className="flex items-center gap-2 ml-4 ">
        <DarkModeToggle/>
        <UserMenu
          user={user}
          onLogout={logout}
          onOpenSettings={() => setShowSettingsModal(true)}
        />
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
