import { useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';
import clsx from 'clsx';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import { useMagicHover } from '../../hooks/useMagicHover';
import type { PopupAnchor } from '../../hooks/useSmartPopupStyle';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore, MINI_TOOLBAR_DEFAULTS, MINI_TOOLBAR_MAX } from '../../store/useSettingsStore';
import { canAccess } from '../../lib/planFeatures';
import ImageInsertModal from '../modals/ImageInsertModal';
import ChecklistTimerModal from '../modals/ChecklistTimerModal';
import TableInsertModal from '../modals/TableInsertModal';
import AttachmentInsertModal from '../modals/AttachmentInsertModal';
import SummarizePreviewModal from '../modals/SummarizePreviewModal';
import ElevatedToolbar from './ElevatedToolbar';
import MiniToolbar from './MiniToolbar';
import ColorPickerPortal from './ColorPickerPortal';
import FontPicker from './FontPicker';
import { useDictation } from './useDictation';
import { useSummarize } from './useSummarize';
import { useToolbarState } from './useToolbarState';
import { ToolbarStateContext } from './ToolbarStateContext';
import { HeadingPicker, CodeLangPicker, FontSizePicker, LineHeightPicker, ChecklistDropdown } from './ToolbarPickers';
import { TEXT_COLORS, HIGHLIGHT_COLORS, menuBtnCls } from './toolbarPopupUtils';
import { buildToolbarButtons, sanitizeMiniToolbarItems, type ToolbarBtn } from './toolbarButtons';

interface RichTextToolbarProps {
  disabled?: boolean;
  noteId?: string;
  onInfo?: () => void;
  onVersionHistory?: () => void;
  minimalChrome?: boolean;
  moreOpen: boolean;
  onMoreToggle: () => void;
}

const RichTextToolbar = ({ disabled = false, noteId, onInfo, onVersionHistory, minimalChrome = false, moreOpen, onMoreToggle }: RichTextToolbarProps) => {
  const { user } = useAuthStore();
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const toolbarState = useToolbarState(moreMenuRef);
  const {
    roundedCount, wordCount,
    fontColor, highlightColor,
    fontPickerPos,
    colorPickerPos, setColorPickerPos,
    highlightPickerPos, setHighlightPickerPos,
    fontSizePos,
    lineHeightPickerPos,
    headingPickerPos,
    codeLangPickerPos,
    checklistDropdownPos,
    showAttachModal, setShowAttachModal,
    showImageModal, setShowImageModal,
    showTableModal, setShowTableModal,
    showTimerModal, setShowTimerModal,
    checklistCountdownHours, setChecklistCountdownHours,
    checklistCountdownMinutes, setChecklistCountdownMinutes,
    checklistExistingTimer, handleChecklistTimerSave, handleChecklistTimerRemove,
    closeAllPopups,
    applyFontColor, applyHighlight,
    insertTable, insertAttachmentNode, insertImageFromUrl,
  } = toolbarState;

  const dictation = useDictation();
  const summarizer = useSummarize();

  const storedMiniItems = useSettingsStore((s) => s.miniToolbarItems);
  const setMiniToolbarItems = useSettingsStore((s) => s.setMiniToolbarItems);
  const miniItems = useMemo(() => sanitizeMiniToolbarItems(storedMiniItems), [storedMiniItems]);

  const { editRow, listsRow, layoutRow, insertRow, historyRow, registry, anyToolActive } = buildToolbarButtons({
    ts: toolbarState,
    dictation,
    summarizer,
    noteId,
    canCodeLang: canAccess(user?.plan, 'syntaxHighlighting'),
    onInfo,
    onVersionHistory,
  });

  // Tools whose handler is absent (e.g. Info in trash) stay stored but don't render.
  const miniTools = miniItems.flatMap((id) => registry.get(id) ?? []);
  const removableIds = useMemo(
    () => new Set(miniItems.filter((id) => !MINI_TOOLBAR_DEFAULTS.includes(id))),
    [miniItems],
  );

  const canAddTool = (id: string) => !miniItems.includes(id) && miniItems.length < MINI_TOOLBAR_MAX;
  const addTool = (id: string) => { if (canAddTool(id)) setMiniToolbarItems([...miniItems, id]); };

  const { onItemEnter: onMoreEnter, onItemLeave: onMoreLeave, Indicator: MoreIndicator } = useMagicHover({ mode: 'free', borderRadius: 8, ref: moreMenuRef });

  // Sub-pickers belong to the More panel: closing the panel dismisses them too.
  useEffect(() => {
    if (!moreOpen) closeAllPopups();
  }, [moreOpen, closeAllPopups]);

  const hasPopupActive = moreOpen || anyToolActive;

  // An open sub-picker docks flush to the panel's left edge; the panel drops its own left
  // rounding/border there so the two read as one connected surface. Pickers anchored at
  // the mini toolbar (no dockSide) must not trigger the seam.
  const isDocked = (p: PopupAnchor | null) => p?.dockSide !== undefined;
  const anyPickerOpen = isDocked(colorPickerPos) || isDocked(highlightPickerPos) || isDocked(fontPickerPos) ||
    isDocked(fontSizePos) || isDocked(lineHeightPickerPos) || isDocked(headingPickerPos) ||
    isDocked(codeLangPickerPos) || isDocked(checklistDropdownPos);

  const renderBtn = (btn: ToolbarBtn) => (
    <div key={btn.id} className="relative group/add">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => btn.action(e)}
        onMouseEnter={onMoreEnter}
        onMouseLeave={onMoreLeave}
        disabled={disabled || !!btn.isDisabled}
        className={menuBtnCls(!!btn.isActive)}
        title={btn.title}
      >
        <btn.icon className="w-4 h-4" />
      </button>
      {canAddTool(btn.id) && (
        <button
          type="button"
          title="Add to quick bar"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.stopPropagation(); addTool(btn.id); }}
          className="absolute -top-1 -right-1 z-1 flex h-4 w-4 items-center justify-center rounded-full border border-(--line) bg-(--panel-bg) text-(--ink-mid) opacity-0 pointer-events-none transition-opacity group-hover/add:opacity-100 group-hover/add:pointer-events-auto hover:text-(--accent)"
        >
          <Plus className="h-3 w-3" />
        </button>
      )}
    </div>
  );

  return (
    <ToolbarStateContext.Provider value={toolbarState}>
    <div className="relative">
      <ElevatedToolbar disabled={disabled} />

      <div
        className={clsx(
          'overflow-hidden transition-all duration-500 ease-out',
          minimalChrome
            ? 'pointer-events-none max-h-0 py-0 opacity-0'
            : 'max-h-40 opacity-100'
        )}
      >
        <div
          className={clsx(
            'mx-8 shrink-0 transition-colors duration-500 sm:mx-14 border-b',
            minimalChrome ? 'border-transparent' : 'border-divider'
          )}
          aria-hidden
        />
        <div className="relative flex h-15.5 shrink-0 items-center gap-3 px-6 sm:px-12">
          <span className="text-xs text-(--ink-dim) tabular-nums tracking-wide select-none">
            <motion.span>{roundedCount}</motion.span> {wordCount === 1 ? 'word' : 'words'}
          </span>
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 min-w-0">
            {dictation.isRecording && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 flex max-w-[60vw] items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--line)_75%,transparent)] bg-(--panel-bg) backdrop-blur-md px-3 py-1.5 text-xs text-(--ink-mid) whitespace-nowrap">
                <span className="w-2 h-2 shrink-0 rounded-full bg-(--danger) animate-pulse" />
                <span className="truncate">{dictation.interimText || 'Listening…'}</span>
              </div>
            )}
            <MiniToolbar
              tools={miniTools}
              removableIds={removableIds}
              disabled={disabled}
              moreActive={hasPopupActive}
              onMoreToggle={onMoreToggle}
              onReorder={setMiniToolbarItems}
              onRemove={(id) => { if (removableIds.has(id)) setMiniToolbarItems(miniItems.filter((x) => x !== id)); }}
            />
          </div>
        </div>
      </div>

      {createPortal(
        <AnimatePresence>
          {moreOpen && !minimalChrome && (
          <motion.div
            ref={moreMenuRef}
            className={clsx(
              'fixed top-1/2 right-0 w-[min(92vw,280px)] max-h-[70vh] overflow-y-auto rounded-r-none border border-r-0 border-[color-mix(in_srgb,var(--line)_50%,transparent)] p-2 glass-popup shadow-2xl z-4 magic-hover',
              anyPickerOpen ? 'rounded-l-none border-l-0' : 'rounded-l-2xl',
            )}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            // Clicking another tool in the panel closes the picker; the picker's own
            // icons stopPropagation, so re-/cross-selecting them is handled by their toggles.
            onClick={() => closeAllPopups()}
            initial={{ x: '110%', y: '-50%' }}
            animate={{ x: 0, y: '-50%' }}
            exit={{ x: '110%', y: '-50%', transition: { duration: 0.18 } }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          >
            {MoreIndicator}
            <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-(--ink-mid)">Edit</p>
            <div className="flex flex-wrap gap-1 px-1 pb-2">
              {editRow.map(renderBtn)}
            </div>
            <div className="h-px border-t border-(--line-soft) my-1" />
            <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-(--ink-mid)">Lists &amp; Layout</p>
            <div className="flex flex-wrap gap-1 px-1 pb-1">
              {listsRow.map(renderBtn)}
            </div>
            <div className="flex flex-wrap gap-1 px-1 pb-2">
              {layoutRow.map(renderBtn)}
            </div>
            <div className="h-px border-t border-(--line-soft) my-1" />
            <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-(--ink-mid)">Insert</p>
            <div className="flex flex-wrap gap-1 px-1 pb-2">
              {insertRow.map(renderBtn)}
            </div>
            <div className="h-px border-t border-(--line-soft) my-1" />
            <div className="flex flex-wrap gap-1 px-1 pb-2">
              {historyRow.map(renderBtn)}
            </div>
          </motion.div>
          )}
        </AnimatePresence>,
        getModalPortalRoot()
      )}

      <HeadingPicker />
      <CodeLangPicker />
      <FontSizePicker />
      <LineHeightPicker />
      <FontPicker />
      <ChecklistDropdown />

      <ColorPickerPortal
        position={colorPickerPos}
        onClose={() => setColorPickerPos(null)}
        color={fontColor}
        onChange={applyFontColor}
        presets={TEXT_COLORS}
        storageKey="dendrite-favorite-colors"
        padding={0}
        canFavorite={canAccess(user?.plan, 'colorFavorites')}
        canCustomColor={canAccess(user?.plan, 'customColor')}
      />

      <ColorPickerPortal
        position={highlightPickerPos}
        onClose={() => setHighlightPickerPos(null)}
        color={highlightColor}
        onChange={applyHighlight}
        presets={HIGHLIGHT_COLORS}
        storageKey="dendrite-favorite-highlights"
        fallbackColor="#fef08a"
        padding={0}
        canFavorite={canAccess(user?.plan, 'colorFavorites')}
        canCustomColor={canAccess(user?.plan, 'customColor')}
      />

      {noteId && (
        <AttachmentInsertModal
          isOpen={showAttachModal}
          onClose={() => setShowAttachModal(false)}
          noteId={noteId}
          onInsert={insertAttachmentNode}
        />
      )}

      <TableInsertModal isOpen={showTableModal} onClose={() => setShowTableModal(false)} onInsert={(r, c) => { insertTable(r, c); setShowTableModal(false); }} />

      <ImageInsertModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onInsert={insertImageFromUrl}
      />

      <SummarizePreviewModal
        status={summarizer.status}
        markdown={summarizer.markdown}
        error={summarizer.error}
        onClose={summarizer.closeSummary}
        onReplace={summarizer.applyReplace}
        onInsertBelow={summarizer.applyInsertBelow}
      />

      <ChecklistTimerModal
        isOpen={showTimerModal}
        onClose={() => setShowTimerModal(false)}
        countdownHours={checklistCountdownHours}
        setCountdownHours={setChecklistCountdownHours}
        countdownMinutes={checklistCountdownMinutes}
        setCountdownMinutes={setChecklistCountdownMinutes}
        existingTimer={checklistExistingTimer}
        onSave={handleChecklistTimerSave}
        onRemove={handleChecklistTimerRemove}
      />
    </div>
    </ToolbarStateContext.Provider>
  );
};

export default RichTextToolbar;
