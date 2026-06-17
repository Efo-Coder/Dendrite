import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMagicHover } from '../../hooks/useMagicHover';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import AppearanceTab from './settings/AppearanceTab';
import EditorTab from './settings/EditorTab';
import SyncTab from './settings/SyncTab';
import ShortcutsTab from './settings/ShortcutsTab';
import FeedbackTab from './settings/FeedbackTab';
import AboutTab from './settings/AboutTab';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const [tab, setTab] = useState<'appearance' | 'editor' | 'sync' | 'shortcuts' | 'feedback' | 'about'>('appearance');
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

  return createPortal(
    <div className={`modal-overlay${closing ? ' closing' : ''}`} onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd">
          <div className="ornament">— · settings · —</div>
          <h3 key={tabSwitched ? tab : undefined} className={tabSwitched ? 'animated' : ''}>{{
            appearance: 'Appearance',
            editor: 'Editor',
            sync: 'Sync & Backup',
            shortcuts: 'Shortcuts',
            feedback: 'Feedback',
            about: 'About',
          }[tab]}</h3>
        </div>

        <div className="settings-grid">
          <div className="settings-nav" ref={navRef} style={{ position: 'relative' }}>
            {Indicator}
            {(['appearance', 'editor', 'sync', 'shortcuts', 'feedback', 'about'] as const).map((t) => (
              <button
                key={t}
                className={tab === t ? 'active' : ''}
                onClick={() => { setTab(t); setTabSwitched(true); }}
                onMouseEnter={onItemEnter}
                onMouseLeave={onItemLeave}
              >
                {t === 'appearance' ? 'Appearance'
                 : t === 'editor' ? 'Editor'
                 : t === 'sync' ? 'Sync & Backup'
                 : t === 'shortcuts' ? 'Shortcuts'
                 : t === 'feedback' ? 'Feedback'
                 : 'About'}
              </button>
            ))}
          </div>

          <div key={tab} className={`settings-pane${tabSwitched ? ' animated' : ''}`}>
            {tab === 'appearance' && <AppearanceTab />}
            {tab === 'editor' && <EditorTab />}
            {tab === 'sync' && <SyncTab />}
            {tab === 'shortcuts' && <ShortcutsTab />}
            {tab === 'feedback' && <FeedbackTab />}
            {tab === 'about' && <AboutTab />}
          </div>
        </div>

        <div className="modal-ft">
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    getModalPortalRoot()
  );
};

export default SettingsModal;
