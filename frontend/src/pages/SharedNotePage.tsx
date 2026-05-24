import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertCircle, Users } from 'lucide-react';
import { getSharedNote, updateSharedNote } from '../services/share.service';
import LexicalEditorWrapper from '../components/editor/LexicalEditorWrapper';
import ThemeProvider from '../components/ui/ThemeProvider';
import { ToastProvider } from '../components/ui/ToastContainer';
import { Note } from '../types';

const CURSOR_COLORS = [
  '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

function randomColor() {
  return CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
}

const SharedNotePage = () => {
  const { token } = useParams<{ token: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const contentRef = useRef('');
  const cursorColor = useRef(randomColor()).current;

  useEffect(() => {
    if (!token) return;
    getSharedNote(token)
      .then(r => {
        setNote(r.data.note);
        setContent(r.data.note.content);
        contentRef.current = r.data.note.content;
      })
      .catch(e => {
        setError(e?.response?.data?.error || 'Dieser Link ist ungültig oder abgelaufen.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleContentChange = useCallback((html: string) => {
    contentRef.current = html;
    setContent(html);
  }, []);

  // Auto-save debounced
  useEffect(() => {
    if (!token || !note) return;
    const timer = setTimeout(async () => {
      if (contentRef.current === note.content) return;
      try {
        await updateSharedNote(token, { content: contentRef.current });
      } catch { /* ignore */ }
    }, 1500);
    return () => clearTimeout(timer);
  }, [content, token, note]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-(--color-bg-base)">
        <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (error || !note || !token) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-(--color-bg-base) text-text-primary">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-lg font-medium">{error || 'Ungültiger Link'}</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-(--color-bg-base) text-text-primary">
      {/* Minimal header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[color-mix(in_srgb,var(--color-border-default)_40%,transparent)] px-6">
        <span className="text-sm font-medium text-text-secondary truncate max-w-xs">
          {note.title || 'Unbenannte Notiz'}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-brand-primary">
          <Users className="w-3.5 h-3.5" />
          <span>Kollaborationsmodus</span>
        </div>
      </div>

      {/* Editor fills remaining space */}
      <div className="min-h-0 flex-1">
        <LexicalEditorWrapper
          key={note.id}
          content={note.content}
          onChange={handleContentChange}
          placeholder="Beginne zu schreiben..."
          collaboration={{
            noteId: note.id,
            token,
            username: 'Gast',
            cursorColor,
          }}
        />
      </div>
    </div>
  );
};

const SharedNotePageWrapper = () => (
  <ThemeProvider>
    <ToastProvider>
      <SharedNotePage />
    </ToastProvider>
  </ThemeProvider>
);

export default SharedNotePageWrapper;
