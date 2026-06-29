import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Share2, Download, Copy, Users, ArrowLeft } from 'lucide-react';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import { canAccess, requiredPlan } from '../../lib/planFeatures';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore, PaletteId } from '../../store/useSettingsStore';
import { PALETTES } from '../../config/palettes';
import { useToast } from '../ui/ToastContainer';
import { noteService, type PdfTheme } from '../../services/note.service';
import { MenuPos, useMenuClamp, downloadFile, makeTurndown } from './noteEditorUtils';

interface NoteExportMenuProps {
  pos: MenuPos | null;
  onClose: () => void;
  onShareNote: () => void;
  hasActiveCollaborators: boolean;
  noteId: string;
  title: string;
  content: string;
  // Exposes the menu's root element so the parent menu can exclude it from its
  // outside-click (cascading submenu).
  panelRef?: React.RefObject<HTMLDivElement | null>;
}

const NoteExportMenu = ({
  pos,
  onClose,
  onShareNote,
  hasActiveCollaborators,
  noteId,
  title,
  content,
  panelRef,
}: NoteExportMenuProps) => {
  const { user } = useAuthStore();
  // Editor appearance is sent along so the PDF matches what the user sees; theme is
  // chosen per-export (defaults to light), the rest mirror the live settings.
  const { palette: userPalette, font, fontSize, density } = useSettingsStore();
  const toast = useToast();
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const [pdfTheme, setPdfTheme] = useState<PdfTheme>('light');
  const [pdfPalette, setPdfPalette] = useState<PaletteId>(userPalette);
  const menuRef = useRef<HTMLDivElement | null>(null);
  // Merge the internal ref with an optional external panelRef.
  const assignRef = useCallback(
    (el: HTMLDivElement | null) => {
      menuRef.current = el;
      if (panelRef) (panelRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    },
    [panelRef]
  );
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

  // PDF export opens an appearance picker first (theme + palette); the request fires
  // from here once the user confirms.
  const runPdfExport = async () => {
    setShowPdfOptions(false);
    onClose();
    try {
      await noteService.exportPdf(noteId, title || 'Note', {
        theme: pdfTheme,
        palette: pdfPalette,
        font,
        fontSize,
        density,
      });
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
    <motion.div
      ref={assignRef}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className="fixed glass-popup rounded-xl shadow-lg py-1 overflow-hidden z-4"
      style={{ left: pos.x, top: pos.y, minWidth: '220px' }}
    >
      {showPdfOptions ? (
        <div className="p-3">
          <button
            type="button"
            onClick={() => setShowPdfOptions(false)}
            className="mb-2.5 flex items-center gap-1.5 text-xs text-(--ink-dim) transition-colors hover:text-(--ink)"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>

          <div className="mb-1.5 text-xs font-medium text-(--ink-mid)">Background</div>
          <div className="mb-3 flex gap-1.5">
            {(['white', 'light', 'dark'] as PdfTheme[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPdfTheme(t)}
                className={`btn-ghost-toggle${pdfTheme === t ? ' active' : ''}`}
              >
                {t === 'white' ? 'White' : t === 'dark' ? 'Dark' : 'Light'}
              </button>
            ))}
          </div>

          <div className="mb-1.5 text-xs font-medium text-(--ink-mid)">Palette</div>
          <div className="mb-3.5 flex flex-wrap gap-2">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.name}
                onClick={() => setPdfPalette(p.id)}
                className={`h-6 w-6 rounded-full border-2 transition-transform ${
                  pdfPalette === p.id ? 'scale-110 border-(--ink)' : 'border-transparent hover:scale-105'
                }`}
                style={{ background: p.color }}
              />
            ))}
          </div>

          <button type="button" onClick={runPdfExport} className="btn primary w-full justify-center">
            Export PDF
          </button>
        </div>
      ) : (
        <>
      <button
        onClick={() => {
          onShareNote();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 pl-3 pr-8 py-2 text-sm transition-colors hover:bg-(--surface-hi)"
      >
        <Users className="w-4 h-4 shrink-0 text-(--accent)" />
        <span className="flex-1 text-left">
          Share note
          {hasActiveCollaborators && (
            <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-(--accent) align-middle" />
          )}
        </span>
      </button>
      <div />
      {(() => {
        const canMd = canAccess(user?.plan, 'markdownExport');
        const canHtml = canAccess(user?.plan, 'htmlExport');
        const canPdf = canAccess(user?.plan, 'pdfExport');
        const canCopy = canAccess(user?.plan, 'copyMarkdown');
        const badge = (feature: Parameters<typeof requiredPlan>[0]) => (
          <span
            style={{
              fontSize: '9px',
              fontFamily: 'var(--mono)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              color: 'var(--accent)',
              opacity: 0.85,
              background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
              padding: '0px 4px',
              borderRadius: '3px',
              marginLeft: 'auto',
              boxShadow: '0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent)',
            }}
          >
            {requiredPlan(feature)}
          </span>
        );

        return (
          <>
            <button
              onClick={canMd ? handleExportMarkdown : undefined}
              disabled={!canMd}
              className={`w-full flex items-center gap-2.5 pl-3 pr-8 py-2 text-sm transition-colors${canMd ? ' hover:bg-(--surface-hi)' : ' cursor-not-allowed'}`}
            >
              <Download className={`w-4 h-4 shrink-0${!canMd ? ' opacity-40' : ''}`} />
              <span className={`flex-1 text-left${!canMd ? ' opacity-40' : ''}`}>
                Export as Markdown
              </span>
              {!canMd && badge('markdownExport')}
            </button>
            <button
              onClick={canHtml ? handleExportHtml : undefined}
              disabled={!canHtml}
              className={`w-full flex items-center gap-2.5 pl-3 pr-8 py-2 text-sm transition-colors${canHtml ? ' hover:bg-(--surface-hi)' : ' cursor-not-allowed'}`}
            >
              <Download className={`w-4 h-4 shrink-0${!canHtml ? ' opacity-40' : ''}`} />
              <span className={`flex-1 text-left${!canHtml ? ' opacity-40' : ''}`}>
                Export as HTML
              </span>
              {!canHtml && badge('htmlExport')}
            </button>
            <button
              onClick={canPdf ? () => setShowPdfOptions(true) : undefined}
              disabled={!canPdf}
              className={`w-full flex items-center gap-2.5 pl-3 pr-8 py-2 text-sm transition-colors${canPdf ? ' hover:bg-(--surface-hi)' : ' cursor-not-allowed'}`}
            >
              <Download className={`w-4 h-4 shrink-0${!canPdf ? ' opacity-40' : ''}`} />
              <span className={`flex-1 text-left${!canPdf ? ' opacity-40' : ''}`}>
                Export as PDF
              </span>
              {!canPdf && badge('pdfExport')}
            </button>
            <button
              onClick={canCopy ? handleCopyMarkdown : undefined}
              disabled={!canCopy}
              className={`w-full flex items-center gap-2.5 pl-3 pr-8 py-2 text-sm transition-colors${canCopy ? ' hover:bg-(--surface-hi)' : ' cursor-not-allowed'}`}
            >
              <Copy className={`w-4 h-4 shrink-0${!canCopy ? ' opacity-40' : ''}`} />
              <span className={`flex-1 text-left${!canCopy ? ' opacity-40' : ''}`}>
                Copy Markdown
              </span>
              {!canCopy && badge('copyMarkdown')}
            </button>
          </>
        );
      })()}
      <button
        onClick={handleShare}
        className="w-full flex items-center gap-2.5 pl-3 pr-8 py-2 text-sm transition-colors hover:bg-(--surface-hi)"
      >
        <Share2 className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left">Share</span>
      </button>
        </>
      )}
    </motion.div>,
    getModalPortalRoot()
  );
};

export default NoteExportMenu;
