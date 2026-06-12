import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Tag as TagIcon } from 'lucide-react';
import clsx from 'clsx';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import { Note } from '../../types';
import { useNoteStore } from '../../store/useNoteStore';
import { useTagStore } from '../../store/useTagStore';
import { useToast } from '../ui/ToastContainer';
import { useMagicHover } from '../../hooks/useMagicHover';

interface NoteTagsRowProps {
  note: Note;
  disabled: boolean;
  onNoteUpdate?: () => void;
}

// Tag chips below the title, inline "+ Add tag" input and the suggestion
// popup (including its animated height transition).
const NoteTagsRow = ({ note, disabled, onNoteUpdate }: NoteTagsRowProps) => {
  const { updateNote } = useNoteStore();
  const { tags, createTag } = useTagStore();
  const toast = useToast();

  const [addingTag, setAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);

  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const prevPopupHeightRef = useRef<number>(0);
  const transitionEndRef = useRef<(() => void) | null>(null);
  const { onItemEnter, onItemLeave, Indicator } = useMagicHover({ mode: 'free', borderRadius: 6, ref: popupRef });

  useEffect(() => {
    if (addingTag && inputWrapperRef.current) {
      const rect = inputWrapperRef.current.getBoundingClientRect();
      setPopupPos({ x: rect.left, y: rect.bottom + 6 });
    } else {
      setPopupPos(null);
    }
  }, [addingTag]);

  // Animate the popup height when typing filters the suggestion list
  useLayoutEffect(() => {
    const el = popupRef.current;
    if (!el || !prevPopupHeightRef.current) return;
    const newHeight = el.scrollHeight;
    if (Math.abs(newHeight - prevPopupHeightRef.current) < 2) return;

    if (transitionEndRef.current) {
      el.removeEventListener('transitionend', transitionEndRef.current);
      transitionEndRef.current = null;
    }

    el.style.transition = 'none';
    el.style.height = `${prevPopupHeightRef.current}px`;
    el.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'height .3s cubic-bezier(.2,.8,.2,1)';
        el.style.height = `${newHeight}px`;

        const onEnd = () => {
          el.style.height = '';
          el.style.transition = '';
          el.style.overflow = '';
          transitionEndRef.current = null;
        };
        transitionEndRef.current = onEnd;
        el.addEventListener('transitionend', onEnd, { once: true });
      });
    });
  }, [newTag]);

  const suggestions = useMemo(() =>
    tags.filter(t =>
      !note.tags?.some(nt => nt.id === t.id) &&
      (newTag.length === 0 || t.name.toLowerCase().startsWith(newTag.toLowerCase()))
    ),
    [tags, note.tags, newTag]
  );

  const handleToggleTag = async (tagId: string) => {
    const currentTagIds = note.tags?.map(t => t.id) || [];
    const isAdding = !currentTagIds.includes(tagId);
    if (isAdding && currentTagIds.length >= 4) { toast.error('Maximum 4 tags per note'); return; }
    const newTagIds = isAdding
      ? [...currentTagIds, tagId]
      : currentTagIds.filter(id => id !== tagId);

    try {
      await updateNote(note.id, { tags: newTagIds });
      toast.info('Tags updated');
      onNoteUpdate?.();
    } catch {
      toast.error('Error updating tags');
    }
  };

  const submitWithName = async (name: string) => {
    const cleanName = name.trim().replace(/^#/, '');
    setNewTag('');
    setAddingTag(false);
    setActiveSuggestion(-1);
    if (!cleanName) return;
    if (cleanName.length > 20) { toast.error('Tag name must be 20 characters or fewer'); return; }
    try {
      const existing = tags.find(t => t.name.toLowerCase() === cleanName.toLowerCase());
      const tagId = existing ? existing.id : (await createTag({ name: cleanName })).id;
      const currentTagIds = note.tags?.map(t => t.id) || [];
      if (!currentTagIds.includes(tagId)) {
        if (currentTagIds.length >= 4) { toast.error('Maximum 4 tags per note'); return; }
        await updateNote(note.id, { tags: [...currentTagIds, tagId] });
        onNoteUpdate?.();
      }
    } catch {
      toast.error('Error adding tag');
    }
  };

  const submit = () => submitWithName(newTag);

  return (
    <div className="editor-byline">
      <div className="editor-tags">
        {note.tags?.map(t => (
          <span key={t.id} className="editor-tag" style={(() => { const live = tags.find(x => x.id === t.id); const c = live?.color ?? t.color; return { color: c, borderColor: `color-mix(in srgb, ${c} 35%, transparent)`, background: `color-mix(in srgb, ${c} 8%, transparent)` }; })()}>
            {t.name}
            {!disabled && (
              <span className="tag-remove" onClick={() => handleToggleTag(t.id)}>×</span>
            )}
          </span>
        ))}
        {!disabled && (note.tags?.length ?? 0) < 4 && (
          addingTag ? (
            <div ref={inputWrapperRef} className="editor-tag-wrapper">
              <input
                autoFocus
                className="editor-tag-input"
                value={newTag}
                maxLength={20}
                onChange={e => {
                  if (popupRef.current) prevPopupHeightRef.current = popupRef.current.offsetHeight;
                  setNewTag(e.target.value);
                  setActiveSuggestion(-1);
                }}
                onBlur={submit}
                onKeyDown={e => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActiveSuggestion(i => Math.min(i + 1, suggestions.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveSuggestion(i => Math.max(i - 1, -1));
                  } else if (e.key === 'Tab' && suggestions.length > 0) {
                    e.preventDefault();
                    setNewTag(suggestions[0].name);
                    setActiveSuggestion(-1);
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (activeSuggestion >= 0 && suggestions[activeSuggestion]) {
                      submitWithName(suggestions[activeSuggestion].name);
                    } else {
                      submit();
                    }
                  } else if (e.key === 'Escape') {
                    setAddingTag(false);
                    setNewTag('');
                    setActiveSuggestion(-1);
                  }
                }}
              />
            </div>
          ) : (
            <button type="button" className="editor-tag-add" onClick={() => setAddingTag(true)}>
              + Add tag
            </button>
          )
        )}
      </div>

      {createPortal(
        <AnimatePresence>
          {popupPos && addingTag && suggestions.length > 0 && (
            <motion.div
              key="inline-tag-popup"
              ref={popupRef}
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="fixed glass-popup rounded-xl shadow-lg py-1 overflow-hidden"
              style={{ left: popupPos.x, top: popupPos.y, minWidth: '180px', zIndex: 50, transformOrigin: 'top left' }}
            >
              {Indicator}
              {suggestions.map((tag, i) => (
                <button
                  key={tag.id}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => submitWithName(tag.name)}
                  onMouseEnter={onItemEnter}
                  onMouseLeave={onItemLeave}
                  className={clsx(
                    'w-full flex items-center space-x-2 px-3 py-2 text-sm relative z-1',
                    i === activeSuggestion ? 'text-(--ink)' : ''
                  )}
                >
                  <TagIcon className="w-4 h-4 shrink-0" style={{ color: tag.color }} />
                  <span className="flex-1 text-left">{tag.name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        getModalPortalRoot()
      )}
    </div>
  );
};

export default NoteTagsRow;
