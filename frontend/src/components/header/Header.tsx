import { useState, useRef } from 'react';
import { Search, Settings } from 'lucide-react';
import { useNoteStore } from '../../store/useNoteStore';
import { User as UserType } from '../../types';
import SettingsModal from '../modals/SettingsModal';
import UserProfileModal from '../modals/UserProfileModal';
import DarkModeToggle from './DarkModeToggle';
import UserMenu from './UserMenu';
import { useGlassPill } from '../../hooks/useGlassPill';

interface HeaderProps {
  user: UserType | null;
}

const Header = ({ user }: HeaderProps) => {
  const { searchNotes, fetchNotes } = useNoteStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

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
    <header className="h-16 min-h-16 max-h-16 glass-header rounded-2xl px-6 flex items-center justify-between relative">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-5 transform -translate-y-1/2 w-5 h-5 text-accent-fg pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Notizen durchsuchen..."
            className="input pl-10 pr-4"
            style={{ background: 'var(--glass-bg-soft)' }}
          />
        </div>
      </form>

      {/* Right side */}
      <div className="flex items-center gap-3 ml-4">
        <span className="text-sm text-accent-fg font-medium select-none">
          {user?.name || user?.email}
        </span>
        <div ref={rightGroupRef} className="flex items-center gap-1 relative" onMouseLeave={onLeave}>
          {pill && (
            <div
              className="glass-pill glass-pill-circle"
              style={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height }}
            />
          )}
          <DarkModeToggle onMouseEnter={(e) => onEnter(e, false)} />
          <button
            onClick={() => setShowSettingsModal(true)}
            onMouseEnter={(e) => onEnter(e, false)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors relative z-10"
            title="Einstellungen"
            aria-label="Einstellungen"
            type="button"
          >
            <Settings className="w-4 h-4 text-accent-fg transition-colors" />
          </button>
          <UserMenu
            onOpenProfile={() => setShowProfileModal(true)}
            onMouseEnter={(e) => onEnter(e, false)}
          />
        </div>
      </div>

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </header>
  );
};

export default Header;
