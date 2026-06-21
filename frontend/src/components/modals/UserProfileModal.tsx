import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LogOut } from 'lucide-react';
import { useMagicHover } from '../../hooks/useMagicHover';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import { useAuthStore } from '../../store/useAuthStore';
import ProfileTab from './profile/ProfileTab';
import SecurityTab from './profile/SecurityTab';
import AccountTab from './profile/AccountTab';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ProfileTabKey = 'profile' | 'security' | 'account';

const TAB_LABELS: Record<ProfileTabKey, string> = {
  profile: 'Profile',
  security: 'Security',
  account: 'Account',
};

const UserProfileModal = ({ isOpen, onClose }: UserProfileModalProps) => {
  const { user, logout } = useAuthStore();
  // Social-login users have no password, so the Security tab is hidden for them.
  const tabs: ProfileTabKey[] = user?.provider
    ? ['profile', 'account']
    : ['profile', 'security', 'account'];

  const [tab, setTab] = useState<ProfileTabKey>('profile');
  const [tabSwitched, setTabSwitched] = useState(false);
  const { containerRef: navRef, onItemEnter, onItemLeave, Indicator } = useMagicHover({ inset: 0, borderRadius: 0 });
  const [visible, setVisible] = useState(isOpen);
  const [closing, setClosing] = useState(false);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setClosing(false);
    } else if (visibleRef.current) {
      setClosing(true);
      const t = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!visible) return null;

  const handleLogout = () => {
    onClose();
    logout();
  };

  return createPortal(
    <div className={`modal-overlay${closing ? ' closing' : ''}`} onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd">
          <div className="ornament">— · user · —</div>
          <h3 key={tabSwitched ? tab : undefined} className={tabSwitched ? 'animated' : ''}>{TAB_LABELS[tab]}</h3>
        </div>

        <div className="settings-grid">
          <div className="settings-nav" ref={navRef} style={{ position: 'relative' }}>
            {Indicator}
            {tabs.map((t) => (
              <button
                key={t}
                className={tab === t ? 'active' : ''}
                onClick={() => { setTab(t); setTabSwitched(true); }}
                onMouseEnter={onItemEnter}
                onMouseLeave={onItemLeave}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>

          <div key={tab} className={`settings-pane${tabSwitched ? ' animated' : ''}`}>
            {tab === 'profile' && <ProfileTab />}
            {tab === 'security' && <SecurityTab />}
            {tab === 'account' && <AccountTab />}
          </div>
        </div>

        <div className="modal-ft">
          <button className="btn-ghost" onClick={onClose}>Close</button>
          <button className="btn-ghost" onClick={handleLogout} style={{ gap: '8px' }}>
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </div>
    </div>,
    getModalPortalRoot()
  );
};

export default UserProfileModal;
