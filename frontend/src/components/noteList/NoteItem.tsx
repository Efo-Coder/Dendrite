import { Note } from '../../types';
import { GripVertical, Folder } from 'lucide-react';
import { Icons } from '../ui/Icons';
import clsx from 'clsx';
import { memo, useEffect, useMemo, useState } from 'react';
import { getFirstLine, getPreview, stripHtml } from './noteListUtils';

export interface NoteItemContentProps {
  note: Note;
  showDragHandle: boolean;
  dateDisplayMode: 'updatedAt' | 'createdAt';
  onSelectNote: (note: Note | null) => void;
}

export const NoteItemContent = ({
  note,
  showDragHandle,
  dateDisplayMode,
  onSelectNote,
}: NoteItemContentProps) => {
  // stripHtml parst den kompletten Note-HTML-Inhalt ins DOM — darf nicht bei jedem Listen-Render laufen
  const { title, preview, wordCount } = useMemo(() => ({
    title: note.title || getFirstLine(note.content),
    preview: note.title ? getFirstLine(note.content) : getPreview(note.content),
    wordCount: stripHtml(note.content).trim().split(/\s+/).filter(Boolean).length,
  }), [note.title, note.content]);

  return (
  <>
    {showDragHandle && (
      <div
        data-draggable
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'grab', color: 'var(--ink-dim)', zIndex: 2,
          touchAction: 'none',
        }}
        className="active:cursor-grabbing hover:text-(--ink-low)"
      >
        <GripVertical style={{ width: '11px', height: '11px' }} />
      </div>
    )}
    <button
      onClick={() => onSelectNote(note)}
      style={{
        flex: 1, minWidth: 0, textAlign: 'left', background: 'none',
        border: 'none', cursor: 'pointer', padding: 0,
        paddingLeft: '18px',
      }}
    >
      <div className="note-card-head" style={{ position: 'relative' }}>
        {note.collaborators && note.collaborators.length > 0 && (
          <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            style={{
              position: 'absolute', right: '100%', top: '50%',
              transform: 'translateY(-50%)', marginRight: '5px',
              width: '11px', height: '11px', color: 'var(--accent)',
              flexShrink: 0,
            }}
          >
            <path d="M5.5 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
            <path d="M11 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
            <path d="M0 13c0-2.76 2.46-5 5.5-5s5.5 2.24 5.5 5H0z" />
            <path d="M13.5 13h-1.14C12.12 11.3 10.9 10 9.36 9.4A3.98 3.98 0 0 1 11 9c2.21 0 4 1.57 4 3.5 0 .28-.23.5-.5.5H13.5z" />
          </svg>
        )}
        <span className="note-card-title">{title}</span>
        {note.isPinned && <span className="note-card-pin" />}
      </div>
      <p className="note-card-preview">
        {preview}
      </p>
      <div className="note-card-folder">
        <Folder style={{ width: '9px', height: '9px', flexShrink: 0 }} />
        {note.folder?.name ?? 'All Notes'}
      </div>
      <div className="note-card-meta">
        <span>{new Date(dateDisplayMode === 'createdAt' ? note.createdAt : note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        <span className="block size-0.5 rounded-full bg-(--ink-dim) shrink-0 self-center -mt-px" />
        <span>{wordCount} words</span>
        {note.tags && note.tags.length > 0 && (
          <>
            <span className="block size-0.5 rounded-full bg-(--ink-dim) shrink-0 self-center -mt-px" />
            <span className="tag-pill">{note.tags[0].name}</span>
          </>
        )}
        {note.isFavorite && <><span style={{ flex: 1 }} /><Icons.starFill size={12} className="star" /></>}
      </div>
    </button>
  </>
  );
};

export interface ExitRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface NoteListItemProps {
  note: Note;
  isSelected: boolean;
  onSelectNote: (note: Note | null) => void;
  showDragHandle: boolean;
  dateDisplayMode: 'updatedAt' | 'createdAt';
  exiting?: boolean;
  /* Position der Karte vor dem Löschen (relativ zum Scroll-Container) — aktiviert den Pop-Exit */
  exitRect?: ExitRect | null;
  stagger?: number;
  isDragSource?: boolean;
  onRightClick?: (e: React.MouseEvent, note: Note) => void;
  onCardPointerDown?: (e: React.PointerEvent, note: Note) => void;
}

// Memoisiert: beim Einfügen/Löschen einer Note rendert nur die betroffene Karte,
// nicht die gesamte Liste
const NoteListItem = memo(({
  note,
  isSelected,
  onSelectNote,
  showDragHandle,
  dateDisplayMode,
  exiting,
  exitRect,
  stagger,
  isDragSource,
  onRightClick,
  onCardPointerDown,
}: NoteListItemProps) => {
  // Enter: erst nach Doppel-rAF öffnen, damit die CSS-Transition vom 0fr-Startwert greift
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    return () => cancelAnimationFrame(r);
  }, []);
  const open = shown && !exiting;

  // Das Clipping (overflow: hidden) wird nur während der Höhen-Transition gebraucht —
  // danach freigeben, sonst wird der Schatten der aktiven Karte abgeschnitten
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!open) {
      setSettled(false);
      return;
    }
    const t = window.setTimeout(() => setSettled(true), 360);
    return () => clearTimeout(t);
  }, [open]);

  // Pop-Exit: Karte verlässt das Layout sofort (absolute an alter Position) und
  // faded aus — die Karten darunter gleiten per FLIP nach (siehe NoteList).
  // Ohne bekannte Position fällt der Exit auf den Höhen-Kollaps zurück.
  const popExit = exiting && exitRect != null;

  return (
    <li
      data-flip-id={note.id}
      className={clsx('note-anim', open && 'open', popExit && 'exit-pop')}
      style={{
        listStyle: 'none',
        '--stagger': `${stagger ?? 0}ms`,
        ...(exiting && exitRect ? { position: 'absolute', top: exitRect.top, left: exitRect.left, width: exitRect.width } : null),
      } as React.CSSProperties}
    >
      <div className="note-anim-inner" style={settled || popExit ? { overflow: 'visible' } : undefined}>
        <div className={clsx('note-card-shell', open && 'open')} style={exiting ? { pointerEvents: 'none' } : undefined}>
          <div
            className={clsx(
              'note-card',
              isSelected && 'active',
              isDragSource && 'dragging',
            )}
            onContextMenu={(e: React.MouseEvent) => onRightClick?.(e, note)}
            onPointerDown={showDragHandle && !exiting ? (e) => onCardPointerDown?.(e, note) : undefined}
          >
            <NoteItemContent
              note={note}
              showDragHandle={showDragHandle}
              dateDisplayMode={dateDisplayMode}
              onSelectNote={onSelectNote}
            />
          </div>
        </div>
      </div>
    </li>
  );
});

export default NoteListItem;
