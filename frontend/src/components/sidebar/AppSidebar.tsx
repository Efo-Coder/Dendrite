import { useState } from 'react';
import { Home, Layers, PenLine, Search, Contrast, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { LOGO_SRC } from '../../config/brand';
import { User as UserType } from '../../types';
import UserProfileModal from '../modals/UserProfileModal';

const API_URL = import.meta.env.VITE_API_URL || '';
const resolveAvatar = (url: string) => (url.startsWith('http') ? url : `${API_URL}${url}`);

type HomeNav = 'home' | 'spaces' | 'reflection';

interface AppSidebarProps {
  active: HomeNav;
  onHome: () => void;
  onSpaces: () => void;
  onThoughts: () => void;
  onReflection: () => void;
  onSearch: () => void;
  user?: UserType | null;
  collapsed?: boolean;
}

const AppSidebar = ({
  active,
  onHome,
  onSpaces,
  onThoughts,
  onReflection,
  onSearch,
  user,
  collapsed,
}: AppSidebarProps) => {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const displayInitial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();

  // 'active' tracks the persistent home views; Thoughts/Search are one-shot actions.
  const items = [
    { key: 'home', label: 'Home', Icon: Home, onClick: onHome, activeWhen: active === 'home' },
    {
      key: 'spaces',
      label: 'Spaces',
      Icon: Layers,
      onClick: onSpaces,
      activeWhen: active === 'spaces',
    },
    { key: 'thoughts', label: 'Thoughts', Icon: PenLine, onClick: onThoughts, activeWhen: false },
    {
      key: 'reflect',
      label: 'Daily Reflection',
      Icon: Contrast,
      onClick: onReflection,
      activeWhen: active === 'reflection',
    },
    { key: 'search', label: 'Search', Icon: Search, onClick: onSearch, activeWhen: false },
  ];

  return (
    <>
      <aside className={clsx('home-sidebar', collapsed && 'collapsed')}>
        <div className="home-sidebar-inner">
          <div className="home-brand">
            <img src={LOGO_SRC} alt="" className="home-brand-glyph" />
            <span className="home-brand-name">DENDRITE</span>
          </div>

          <nav className="home-nav">
            {items.map(({ key, label, Icon, onClick, activeWhen }) => (
              <button
                key={key}
                type="button"
                onClick={onClick}
                className={clsx('home-nav-item', activeWhen && 'active')}
              >
                <span className="home-nav-icon">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                {label}
              </button>
            ))}
          </nav>

          <button
            type="button"
            className="home-user"
            onClick={() => setShowProfileModal(true)}
            title="Profile"
          >
            <span className="home-user-avatar avatar-fill">
              {user?.avatarUrl ? (
                <img
                  src={resolveAvatar(user.avatarUrl)}
                  alt=""
                  onError={e => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                displayInitial
              )}
            </span>
            <span className="home-user-name">{user?.name || user?.email || 'Profile'}</span>
            <ChevronDown size={14} className="home-user-chevron" />
          </button>
        </div>
      </aside>

      <UserProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </>
  );
};

export default AppSidebar;
