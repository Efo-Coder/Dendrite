import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
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
      onClose();
    } finally {
      setRestoringId(null);
      setConfirmId(null);
    }
  };

  const panelContent = (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-4"
          onClick={onClose}
        />
      )}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="version-panel"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="fixed right-4 top-16 bottom-4 w-72 z-5 flex flex-col rounded-2xl border border-[color-mix(in_srgb,var(--line)_50%,transparent)] glass-popup shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[color-mix(in_srgb,var(--line)_40%,transparent)] shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-(--accent)" />
                <span className="text-sm font-medium text-(--ink)">Version History</span>
              </div>
              <button
                onClick={onClose}
                className="icon-btn-md rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Plan hint */}
            <div className="px-4 py-2 shrink-0">
              <p className="text-[11px] text-(--ink-dim)">
                {plan === 'free'
                  ? `Free plan · last ${limit} versions saved`
                  : plan === 'writer'
                    ? `Writer plan · last ${limit} versions saved`
                    : 'Author plan · all versions saved'
                }
              </p>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-2 pb-3">
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
                const isLocked = plan === 'free' && i >= limit;
                const isConfirming = confirmId === v.id;
                const isRestoring = restoringId === v.id;

                return (
                  <div
                    key={v.id}
                    className={clsx(
                      'rounded-xl px-3 py-2.5 mb-1 transition-colors',
                      !isLocked && 'hover:bg-(--surface-hi)'
                    )}
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
                            className="text-[11px] text-(--ink-dim) hover:text-(--ink) transition-colors px-1.5 py-0.5 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleRestore(v.id)}
                            disabled={!!isRestoring}
                            className="text-[11px] text-(--accent) hover:opacity-80 transition-opacity font-medium px-1.5 py-0.5 rounded"
                          >
                            {isRestoring ? '…' : 'Restore'}
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

                    {isConfirming && !isLocked && (
                      <p className="text-[11px] text-(--ink-dim) mt-1.5">
                        This will replace the current note content.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return createPortal(panelContent, getModalPortalRoot());
}
