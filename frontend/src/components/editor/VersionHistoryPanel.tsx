import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useMagicHover } from '../../hooks/useMagicHover';
import { NoteVersion } from '../../types';
import { noteService } from '../../services/note.service';
import { History, X, RotateCcw, Lock } from 'lucide-react';
import clsx from 'clsx';

interface VersionHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
  userPlan: string;
  onRestore: (noteId: string, versionId: string) => Promise<void>;
}

function formatVersionDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD < 7) return `${diffD}d ago`;
  return date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatVersionTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

const PLAN_LIMITS: Record<string, number> = {
  free: 5,
  writer: 50,
  author: Infinity,
};

export default function VersionHistoryPanel({ isOpen, onClose, noteId, userPlan, onRestore }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const { containerRef, onItemEnter, onItemLeave, Indicator } = useMagicHover({
    ref: listRef,
    inset: 0,
    borderRadius: 9,
  });

  const plan = (userPlan || 'free').toLowerCase();
  const limit = PLAN_LIMITS[plan] ?? 5;

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    noteService.getNoteVersions(noteId)
      .then(({ versions }) => setVersions(versions))
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [isOpen, noteId]);

  const handleRestore = async (versionId: string) => {
    setRestoringId(versionId);
    try {
      await onRestore(noteId, versionId);
    } finally {
      setRestoringId(null);
      setConfirmId(null);
    }
  };

  return (
    <div
      className="absolute right-0 top-0 bottom-0 w-64 border-l border-(--line-soft) transition-transform duration-300 ease-out z-20"
      style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
    >
      <div className="w-full h-full flex flex-col bg-(--surface)">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-(--line-soft) shrink-0">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-(--accent)" />
            <span className="text-sm font-medium text-(--ink)">Version History</span>
          </div>
          <button onClick={onClose} className="icon-btn-md rounded-lg transition-colors" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Plan hint */}
        <div className="px-4 py-2 shrink-0">
          <p className="text-[11px] text-(--ink-dim)">
            {plan === 'free'
              ? `Free plan · last ${limit} versions`
              : plan === 'writer'
                ? `Writer plan · last ${limit} versions`
                : 'Author plan · all versions'
            }
          </p>
        </div>

        {/* List */}
        <div ref={containerRef} className="flex-1 overflow-y-auto px-2 pb-3 relative">
          {Indicator}

          {loading && (
            <div className="flex items-center justify-center h-24">
              <span className="text-sm text-(--ink-dim)">Loading…</span>
            </div>
          )}

          {!loading && versions.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 h-32 text-center px-4">
              <History className="w-8 h-8 text-(--ink-dim) opacity-40" />
              <p className="text-sm text-(--ink-dim)">No saved versions yet.</p>
              <p className="text-[11px] text-(--ink-dim) opacity-70">Versions are saved automatically every 5 minutes while editing.</p>
            </div>
          )}

          {!loading && versions.map((v, i) => {
            const isLocked = i >= limit;
            const isConfirming = confirmId === v.id;
            const isRestoring = restoringId === v.id;

            return (
              <motion.div
                key={v.id}
                layout
                onMouseEnter={isLocked ? undefined : onItemEnter}
                onMouseLeave={isLocked ? undefined : onItemLeave}
                className="rounded-xl px-3 py-2.5 mb-1 relative z-10"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={clsx('min-w-0', isLocked && 'opacity-40')}>
                    <p className="text-sm font-medium text-(--ink) truncate">
                      {v.title || 'Untitled'}
                    </p>
                    <p className="text-[11px] text-(--ink-dim) mt-0.5">
                      {formatVersionDate(v.createdAt)} · {formatVersionTime(v.createdAt)}
                    </p>
                  </div>

                  {isLocked ? (
                    <div className="shrink-0 flex items-center gap-1 text-[10px] text-(--accent) opacity-80 font-medium" style={{ fontFamily: 'var(--mono)', letterSpacing: '0.05em', background: 'color-mix(in srgb, var(--accent) 10%, transparent)', padding: '1px 4px', borderRadius: '3px', boxShadow: '0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent)' }}>
                      <Lock className="w-3 h-3" />
                      Writer
                    </div>
                  ) : isConfirming ? (
                    <div className="shrink-0 flex items-center gap-1">
                      <button
                        onClick={() => setConfirmId(null)}
                        className="group text-[11px] text-(--ink-dim) hover:text-(--ink) transition-colors px-1.5 py-0.5"
                      >
                        <span className="nav-underline">Cancel</span>
                      </button>
                      <button
                        onClick={() => handleRestore(v.id)}
                        disabled={!!isRestoring}
                        className="group text-[11px] text-(--accent) hover:text-(--ink) transition-colors font-medium px-1.5 py-0.5"
                      >
                        <span className="nav-underline">{isRestoring ? '…' : 'Restore'}</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(v.id)}
                      className="shrink-0 icon-btn-md rounded-lg transition-colors hover:text-(--accent)"
                      title="Restore this version"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {isConfirming && !isLocked && (
                    <motion.div
                      key="hint"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <p className="text-[11px] text-(--ink-dim) mt-1.5">
                        This will replace the current note content.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
