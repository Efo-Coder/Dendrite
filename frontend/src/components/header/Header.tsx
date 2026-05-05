import { useState, useRef } from 'react';
import { Search } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useNoteStore } from '../../store/useNoteStore';
import { User as UserType } from '../../types';
import SettingsModal from '../modals/SettingsModal';
import DarkModeToggle from './DarkModeToggle';
import UserMenu from './UserMenu';
import { useGlassPill } from '../../hooks/useGlassPill';
import clsx from 'clsx';

interface HeaderProps {
  user: UserType | null;
}

const Header = ({ user }: HeaderProps) => {
  const { logout } = useAuthStore();
  const { searchNotes, fetchNotes } = useNoteStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const rightGroupRef = useRef<HTMLDivElement>(null);
  const { pill, onEnter, onLeave } = useGlassPill(rightGroupRef);

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
    <header className="h-16 min-h-16 max-h-16 glass-surface rounded-2xl px-6 flex items-center justify-between relative">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-accent-subtle" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Notizen durchsuchen..."
            className="input pl-10 pr-4"
          />
        </div>
      </form>

      {/* Dark Mode Toggle & User Menu */}
      <div ref={rightGroupRef} className="flex items-center gap-2 ml-4 relative" onMouseLeave={onLeave}>
        {pill && (
          <div
            className={clsx('glass-pill', pill.isActive && 'glass-pill-active')}
            style={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height }}
          />
        )}
        <DarkModeToggle onMouseEnter={(e) => onEnter(e, false)} />
        <UserMenu
          user={user}
          onLogout={logout}
          onOpenSettings={() => setShowSettingsModal(true)}
          onMouseEnter={(e) => onEnter(e, false)}
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
