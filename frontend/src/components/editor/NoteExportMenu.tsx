import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Share2, Download, Copy, Users } from 'lucide-react';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import { canAccess, requiredPlan } from '../../lib/planFeatures';
import { useAuthStore } from '../../store/useAuthStore';
import { useToast } from '../ui/ToastContainer';
import { noteService } from '../../services/note.service';
import { MenuPos, useMenuClamp, downloadFile, makeTurndown } from './noteEditorUtils';

interface NoteExportMenuProps {
  pos: MenuPos | null;
  onClose: () => void;
  onShareNote: () => void;
  hasActiveCollaborators: boolean;
  noteId: string;
  title: string;
  content: string;
}

const NoteExportMenu = ({
  pos,
  onClose,
  onShareNote,
  hasActiveCollaborators,
  noteId,
  title,
  content,
}: NoteExportMenuProps) => {
  const { user } = useAuthStore();
  const toast = useToast();
  const menuRef = useRef<HTMLDivElement>(null);
  useMenuClamp(pos, menuRef);

  useEffect(() => {
    if (!pos) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [pos, onClose]);

  const handleExportMarkdown = () => {
    const md = makeTurndown().turndown(content || '');
    downloadFile(`${title || 'Note'}.md`, `# ${title}\n\n${md}`, 'text/markdown');
    onClose();
    toast.success('Markdown exported');
  };

  const handleExportHtml = () => {
    const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="UTF-8">\n<title>${safeTitle}</title>\n<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.6}img{max-width:100%}</style>\n</head>\n<body>\n<h1>${safeTitle}</h1>\n${content}\n</body>\n</html>`;
    downloadFile(`${title || 'Note'}.html`, html, 'text/html');
    onClose();
    toast.success('HTML exported');
  };

  const handleExportPdf = async () => {
    onClose();
    try {
      await noteService.exportPdf(noteId, title || 'Note');
      toast.success('PDF exported');
    } catch {
      toast.error('PDF export failed');
    }
  };

  const handleCopyMarkdown = async () => {
    const md = makeTurndown().turndown(content || '');
    await navigator.clipboard.writeText(`# ${title}\n\n${md}`);
    toast.success('Markdown copied');
    onClose();
  };

  const handleShare = async () => {
    const md = makeTurndown().turndown(content || '');
    const text = `${title}\n\n${md}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    }
    onClose();
  };

  if (!pos) return null;

  return createPortal(
    <>
      <div className="fixed inset-0" onClick={onClose} />
      <div
        ref={menuRef}
        className="fixed glass-popup rounded-xl shadow-lg py-1 overflow-hidden"
        style={{ left: pos.x, top: pos.y, minWidth: '220px' }}
      >
        <button
          onClick={() => { onShareNote(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-(--surface-hi)"
        >
          <Users className="w-4 h-4 shrink-0 text-(--accent)" />
          <span className="flex-1 text-left">
            Share note
            {hasActiveCollaborators && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-(--accent) align-middle" />}
          </span>
        </button>
        <div className="my-1 mx-2 border-t border-[color-mix(in_srgb,var(--line)_50%,transparent)]" />
        {(() => {
          const canMd   = canAccess(user?.plan, 'markdownExport');
          const canHtml = canAccess(user?.plan, 'htmlExport');
          const canPdf  = canAccess(user?.plan, 'pdfExport');
          const canCopy = canAccess(user?.plan, 'copyMarkdown');
          const badge = (feature: Parameters<typeof requiredPlan>[0]) => (
            <span style={{ fontSize: '9px', fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--accent)', opacity: 0.85, background: 'color-mix(in srgb, var(--accent) 10%, transparent)', padding: '1px 4px', borderRadius: '3px', marginLeft: 'auto', boxShadow: '0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent)' }}>
              {requiredPlan(feature)}
            </span>
          );
          return (
            <>
              <button onClick={canMd ? handleExportMarkdown : undefined} disabled={!canMd} className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors${canMd ? ' hover:bg-(--surface-hi)' : ' cursor-not-allowed'}`}>
                <Download className={`w-4 h-4 shrink-0${!canMd ? ' opacity-40' : ''}`} />
                <span className={`flex-1 text-left${!canMd ? ' opacity-40' : ''}`}>Export as Markdown</span>
                {!canMd && badge('markdownExport')}
              </button>
              <button onClick={canHtml ? handleExportHtml : undefined} disabled={!canHtml} className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors${canHtml ? ' hover:bg-(--surface-hi)' : ' cursor-not-allowed'}`}>
                <Download className={`w-4 h-4 shrink-0${!canHtml ? ' opacity-40' : ''}`} />
                <span className={`flex-1 text-left${!canHtml ? ' opacity-40' : ''}`}>Export as HTML</span>
                {!canHtml && badge('htmlExport')}
              </button>
              <button onClick={canPdf ? handleExportPdf : undefined} disabled={!canPdf} className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors${canPdf ? ' hover:bg-(--surface-hi)' : ' cursor-not-allowed'}`}>
                <Download className={`w-4 h-4 shrink-0${!canPdf ? ' opacity-40' : ''}`} />
                <span className={`flex-1 text-left${!canPdf ? ' opacity-40' : ''}`}>Export as PDF</span>
                {!canPdf && badge('pdfExport')}
              </button>
              <div className="my-1 mx-2 border-t border-[color-mix(in_srgb,var(--line)_50%,transparent)]" />
              <button onClick={canCopy ? handleCopyMarkdown : undefined} disabled={!canCopy} className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors${canCopy ? ' hover:bg-(--surface-hi)' : ' cursor-not-allowed'}`}>
                <Copy className={`w-4 h-4 shrink-0${!canCopy ? ' opacity-40' : ''}`} />
                <span className={`flex-1 text-left${!canCopy ? ' opacity-40' : ''}`}>Copy Markdown</span>
                {!canCopy && badge('copyMarkdown')}
              </button>
            </>
          );
        })()}
        <button onClick={handleShare} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-(--surface-hi)">
          <Share2 className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">Share</span>
        </button>
      </div>
    </>,
    getModalPortalRoot()
  );
};

export default NoteExportMenu;
