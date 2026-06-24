import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { MagicInput } from '../components/ui/MagicInput';
import { useReflectionStore } from '../store/useReflectionStore';
import { useLenisScroll } from '../hooks/useLenisScroll';
import { useToast } from '../components/ui/ToastContainer';
import { getApiErrorMessage } from '../lib/apiError';
import { quotePrompt } from '../lib/reflectionText';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

const ReflectionView = () => {
  const today = useReflectionStore((s) => s.today);
  const prompt = useReflectionStore((s) => s.prompt);
  const history = useReflectionStore((s) => s.history);
  const fetchToday = useReflectionStore((s) => s.fetchToday);
  const fetchHistory = useReflectionStore((s) => s.fetchHistory);
  const saveToday = useReflectionStore((s) => s.saveToday);
  const toast = useToast();

  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [inputHeight, setInputHeight] = useState<number | null>(null);
  const scrollRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useLenisScroll(scrollRef, contentRef, 'reflection');

  useEffect(() => {
    fetchToday();
    fetchHistory();
  }, [fetchToday, fetchHistory]);

  // Prefill once today's entry loads.
  useEffect(() => {
    setText(today?.content ?? '');
  }, [today]);

  const handleSave = async () => {
    const value = text.trim();
    if (!value) return;
    setSaving(true);
    try {
      // Artificial floor so the spinner reads as a deliberate beat, not a flicker.
      await Promise.all([saveToday(value), new Promise((r) => setTimeout(r, 900))]);
      await fetchHistory();
      toast.success('Reflection saved');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not save reflection'));
    } finally {
      setSaving(false);
    }
  };

  // The browser owns the native textarea resize grip and ignores our cursor there,
  // so we drive resizing from our own handle (which can carry the gold cursor) and
  // clamp the height to 150px–50vh.
  const startResize = (e: ReactPointerEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = inputRef.current?.offsetHeight ?? 150;
    const max = Math.round(window.innerHeight * 0.5);
    document.documentElement.classList.add('reflection-resizing');

    const onMove = (ev: PointerEvent) => {
      setInputHeight(Math.min(max, Math.max(150, startH + (ev.clientY - startY))));
    };
    const onUp = () => {
      document.documentElement.classList.remove('reflection-resizing');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const past = history.filter((r) => !today || r.id !== today.id);

  return (
    <main ref={scrollRef} className="home-main reflection-main">
      <div ref={contentRef} className="home-content">
        <header className="home-header">
          <p className="home-greeting">Daily Reflection</p>
          <h1 className="home-headline reflection-prompt">{prompt ? quotePrompt(prompt) : '…'}</h1>
        </header>

        <div className="reflection-compose">
          <div className="reflection-field">
            <MagicInput
              multiline
              ref={inputRef}
              className="reflection-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Take a moment, and write what comes…"
              rows={6}
              style={{ height: inputHeight ?? undefined }}
              wrapperStyle={{ borderRadius: '16px' }}
            />
            <span className="reflection-resizer resize-handle-ns" onPointerDown={startResize} />
          </div>
          <div className="reflection-actions">
            <button type="button" className="btn primary reflection-save" onClick={handleSave} disabled={saving || !text.trim()}>
              {saving ? (
                <span className="flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" />Saving…</span>
              ) : today ? 'Update' : 'Save'}
            </button>
          </div>
        </div>

        {past.length > 0 && (
          <section className="reflection-history">
            <h2 className="home-section-title">Past reflections</h2>
            <ul className="reflection-list">
              {past.map((r) => (
                <li key={r.id} className="reflection-entry">
                  <span className="reflection-entry-date">{formatDate(r.date)}</span>
                  <p className="reflection-entry-prompt">{quotePrompt(r.prompt)}</p>
                  <p className="reflection-entry-content">{r.content}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
};

export default ReflectionView;
