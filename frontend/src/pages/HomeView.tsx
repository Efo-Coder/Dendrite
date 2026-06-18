import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, SquarePen } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useNoteStore } from '../store/useNoteStore';
import { useFolderStore } from '../store/useFolderStore';
import { useToast } from '../components/ui/ToastContainer';
import { getApiErrorMessage } from '../lib/apiError';
import { Folder } from '../types';
import CoverCard from '../components/home/CoverCard';
import HomeSearch from '../components/home/HomeSearch';
import DarkModeToggle from '../components/sidebar/DarkModeToggle';
import SettingsModal from '../components/modals/SettingsModal';
import { Icons } from '../components/ui/Icons';
import { noteLabel } from '../lib/noteText';

interface HomeViewProps {
  onOpenNote: (id: string) => void;
  onOpenSpace: (id: string) => void;
  onAllThoughts: () => void;
  onAllSpaces: () => void;
}

// Time-of-day greeting, mirrors the workspace titlebar logic.
function greetingFor(name: string): string {
  const hour = new Date().getHours();
  const salutation =
    hour >= 5 && hour < 12 ? 'Good morning' :
    hour >= 12 && hour < 18 ? 'Good afternoon' :
    hour >= 18 && hour < 22 ? 'Good evening' :
    'Good night';
  return name ? `${salutation}, ${name}` : salutation;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86_400_000;
  const days = Math.floor(diff / day);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  if (days < 30) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  return months <= 1 ? '1 month ago' : `${months} months ago`;
}

const HomeView = ({ onOpenNote, onOpenSpace, onAllThoughts, onAllSpaces }: HomeViewProps) => {
  const user = useAuthStore((s) => s.user);
  const notes = useNoteStore((s) => s.notes);
  const fetchNotes = useNoteStore((s) => s.fetchNotes);
  const folders = useFolderStore((s) => s.folders);
  const fetchFolders = useFolderStore((s) => s.fetchFolders);
  const createNote = useNoteStore((s) => s.createNote);
  const toast = useToast();
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetchNotes({ archived: false, deleted: false });
    fetchFolders();
  }, [fetchNotes, fetchFolders]);

  const handleNewNote = async () => {
    try {
      const note = await createNote({ content: '' });
      onOpenNote(note.id);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not create note'));
    }
  };

  const firstName = (user?.name || user?.email || '').split(/[\s@]/)[0];

  const recent = useMemo(
    () =>
      [...notes]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 4),
    [notes],
  );

  const spaces = useMemo(() => folders.slice(0, 5), [folders]);

  return (
    <main className="home-main">
      <div className="home-content">
        <div className="home-topbar">
          <DarkModeToggle className="home-icon-btn" />
          <button type="button" className="home-icon-btn" onClick={() => setShowSettings(true)} title="Settings">
            <Icons.settings size={18} />
          </button>
          <button type="button" className="home-icon-btn" onClick={handleNewNote} title="New note">
            <SquarePen size={18} strokeWidth={1.75} />
          </button>
        </div>

        <header className="home-header">
          <p className="home-greeting">{greetingFor(firstName)}</p>
          <h1 className="home-headline">
            What would you like<br />to think about today?
          </h1>
        </header>

        <HomeSearch onOpenNote={onOpenNote} onOpenSpace={onOpenSpace} />

        <Section title="Continue Thinking" onViewAll={onAllThoughts}>
          {recent.length === 0 ? (
            <p className="home-empty">Nothing yet — your recent thoughts will gather here.</p>
          ) : (
            <div className="home-card-row cols-4">
              {recent.map((note) => (
                <CoverCard
                  key={note.id}
                  title={noteLabel(note)}
                  subtitle={`Last explored ${timeAgo(note.updatedAt)}`}
                  cover={note.coverImage}
                  seed={note.id}
                  onClick={() => onOpenNote(note.id)}
                />
              ))}
            </div>
          )}
        </Section>

        <Section title="Spaces" onViewAll={onAllSpaces}>
          {spaces.length === 0 ? (
            <p className="home-empty">No spaces yet — create one to organise your thinking.</p>
          ) : (
            <div className="home-card-row cols-5">
              {spaces.map((folder: Folder) => (
                <CoverCard
                  key={folder.id}
                  title={folder.name}
                  cover={folder.coverImage}
                  seed={folder.id}
                  compact
                  onClick={() => onOpenSpace(folder.id)}
                />
              ))}
            </div>
          )}
        </Section>
      </div>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </main>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  onViewAll: () => void;
  children: React.ReactNode;
}

const Section = ({ title, onViewAll, children }: SectionProps) => (
  <section className="home-section">
    <div className="home-section-head">
      <h2 className="home-section-title">{title}</h2>
      <button type="button" className="home-view-all" onClick={onViewAll}>
        View all <ArrowRight size={13} />
      </button>
    </div>
    {children}
  </section>
);

export default HomeView;
