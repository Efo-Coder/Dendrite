import type { ComponentType, MouseEvent } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Superscript, Subscript,
  Heading, Palette, Highlighter, Type,
  List, ListOrdered, ListChecks, Quote, CodeXml,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, ListChevronsUpDown,
  IndentIncrease, IndentDecrease,
  Paperclip, Image, Minus, Table, Mic, Sparkles,
  Undo, Redo, Info, History,
} from 'lucide-react';
import { getLanguageFriendlyName } from '@lexical/code';
import type { PopupAnchor } from '../../hooks/useSmartPopupStyle';
import { MINI_TOOLBAR_DEFAULTS, MINI_TOOLBAR_MAX } from '../../store/useSettingsStore';
import { LANG_ICONS, isToolbarActive } from './toolbarPopupUtils';
import type { useToolbarState } from './useToolbarState';
import type { useDictation } from './useDictation';
import type { useSummarize } from './useSummarize';

// Every editor tool as one definition with a stable id, shared by the More panel and the
// customisable mini toolbar. The id is what gets persisted in the settings store.

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToolbarBtn = {
  id: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number | string }>;
  title: string;
  // Picker tools receive an anchor when triggered from the mini toolbar; without one they
  // fall back to docking against the More panel (tbAnchor in useToolbarState).
  action: (e: MouseEvent<HTMLButtonElement>, anchor?: PopupAnchor) => void;
  isActive?: boolean;
  isDisabled?: boolean;
};

export type ToolbarButtons = {
  editRow: ToolbarBtn[];
  listsRow: ToolbarBtn[];
  layoutRow: ToolbarBtn[];
  insertRow: ToolbarBtn[];
  historyRow: ToolbarBtn[];
  // Every tool by id, including the mini-only entries (info, version history).
  registry: Map<string, ToolbarBtn>;
  anyToolActive: boolean;
};

interface ToolbarButtonsInput {
  ts: ReturnType<typeof useToolbarState>;
  dictation: ReturnType<typeof useDictation>;
  summarizer: ReturnType<typeof useSummarize>;
  noteId?: string;
  canCodeLang: boolean;
  onInfo?: () => void;
  onVersionHistory?: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

// Static id catalogue for sanitising persisted orders (the built registry varies with
// props, e.g. info is absent in trash, so it can't serve as the validity source).
export const ALL_TOOL_IDS: ReadonlySet<string> = new Set([
  'bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript',
  'heading', 'drop-cap', 'font-color', 'highlight', 'font-family', 'font-size',
  'bullet-list', 'numbered-list', 'checklist', 'quote', 'code',
  'align-left', 'align-center', 'align-right', 'align-justify', 'line-height', 'indent', 'outdent',
  'attach', 'image', 'divider', 'table', 'dictate', 'summarize',
  'undo', 'redo', 'info', 'version-history',
]);

// ─── Icons ───────────────────────────────────────────────────────────────────

// Drop cap: an oversized serif initial beside lines of body text.
const DropCapIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <text x="0.5" y="19" fontFamily="Georgia, 'Times New Roman', serif" fontSize="20" fontWeight="600" fill="currentColor">A</text>
    <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <line x1="13" y1="9" x2="21.5" y2="9" />
      <line x1="13" y1="14" x2="21.5" y2="14" />
      <line x1="13" y1="19" x2="21.5" y2="19" />
    </g>
  </svg>
);

const FontSizeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 29.000999 19" className={className} fill="currentColor"><g transform="translate(-90.999,-506)"><path d="m 119.115,523.838 c -0.325,-0.07 -0.611,-0.176 -0.857,-0.316 -0.326,-0.193 -0.577,-0.398 -0.753,-0.613 -0.177,-0.217 -0.321,-0.455 -0.437,-0.721 -0.687,-1.619 -1.518,-3.66 -2.495,-6.125 -0.978,-2.465 -2.329,-5.818 -4.054,-10.063 h -2.641 c -1.241,2.994 -2.375,5.73 -3.399,8.213 -1.026,2.482 -2.049,4.961 -3.07,7.434 -0.167,0.422 -0.376,0.789 -0.627,1.096 -0.251,0.309 -0.557,0.568 -0.917,0.779 -0.212,0.133 -0.5,0.236 -0.865,0.31 -0.365,0.074 -0.693,0.121 -0.984,0.139 V 525 h 7.686 v -1.029 c -0.995,-0.088 -1.707,-0.231 -2.133,-0.43 -0.428,-0.197 -0.641,-0.438 -0.641,-0.719 0,-0.088 0.015,-0.242 0.047,-0.463 0.029,-0.219 0.129,-0.576 0.297,-1.068 0.132,-0.379 0.288,-0.81 0.469,-1.295 0.139,-0.371 0.265,-0.697 0.385,-0.996 h 6.691 l 1.486,3.611 c 0.061,0.148 0.099,0.268 0.111,0.355 0.014,0.088 0.021,0.168 0.021,0.238 0,0.203 -0.321,0.371 -0.964,0.508 -0.643,0.137 -0.995,0.223 -1.471,0.258 V 525 h 10 v -1.029 c -0.264,-0.018 -0.56,-0.061 -0.885,-0.133 z M 109.994,517 h -5.064 l 2.514,-6.365 z" /><path d="m 106.547,524.144 c -0.24,-0.053 -0.451,-0.129 -0.633,-0.234 -0.24,-0.143 -0.425,-0.293 -0.555,-0.451 -0.129,-0.16 -0.236,-0.336 -0.32,-0.531 -0.506,-1.193 -1.119,-2.697 -1.84,-4.514 -0.719,-1.816 -1.715,-4.287 -2.986,-7.414 h -1.945 c -0.914,2.205 -1.75,4.223 -2.506,6.053 -0.756,1.828 -1.51,3.654 -2.262,5.477 -0.123,0.31 -0.277,0.58 -0.462,0.809 -0.185,0.227 -0.41,0.418 -0.676,0.572 -0.156,0.098 -0.368,0.174 -0.638,0.23 -0.27,0.055 -0.512,0.088 -0.725,0.102 V 525 h 5.662 v -0.758 c -0.732,-0.065 -1.257,-0.17 -1.571,-0.316 -0.313,-0.146 -0.472,-0.322 -0.472,-0.531 0,-0.064 0.012,-0.178 0.035,-0.34 0.021,-0.162 0.094,-0.424 0.218,-0.787 0.097,-0.279 0.212,-0.598 0.346,-0.955 0.034,-0.092 0.237,-0.607 0.516,-1.313 h 4.479 l 1.314,3.24 c 0.045,0.109 0.072,0.197 0.082,0.262 0.01,0.064 0.016,0.123 0.016,0.176 0,0.148 -0.238,0.273 -0.711,0.375 -0.475,0.1 -0.886,0.164 -1.236,0.19 V 525 H 107 v -0.758 c 0,0 -0.213,-0.045 -0.453,-0.098 z M 96.129,519 c 0.795,-2.008 1.817,-4.584 1.817,-4.584 l 1.86,4.584 z" /></g></svg>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Storage may contain stale ids or duplicates (older versions, cross-tab races); rebuild
// a valid order with every default present and the cap enforced (added tools drop first,
// newest first — defaults may never fall out).
export function sanitizeMiniToolbarItems(stored: string[]): string[] {
  const items = stored.filter((id, i) => ALL_TOOL_IDS.has(id) && stored.indexOf(id) === i);
  for (const d of MINI_TOOLBAR_DEFAULTS) if (!items.includes(d)) items.push(d);
  for (let i = items.length - 1; i >= 0 && items.length > MINI_TOOLBAR_MAX; i--) {
    if (!MINI_TOOLBAR_DEFAULTS.includes(items[i])) items.splice(i, 1);
  }
  return items;
}

// ─── Builder ─────────────────────────────────────────────────────────────────

export function buildToolbarButtons({ ts, dictation, summarizer, noteId, canCodeLang, onInfo, onVersionHistory }: ToolbarButtonsInput): ToolbarButtons {
  const isInCode = ts.blockType === 'code';

  const CodeToolIcon = ({ className }: { className?: string }) => {
    const LangIcon = canCodeLang && isInCode ? LANG_ICONS[ts.codeLanguage] : undefined;
    if (LangIcon) return <LangIcon className={className} />;
    if (canCodeLang && isInCode) {
      return <span className="font-mono text-[10px] leading-none px-0.5">{getLanguageFriendlyName(ts.codeLanguage).slice(0, 4).toUpperCase()}</span>;
    }
    return <CodeXml className={className} />;
  };

  const editRow: ToolbarBtn[] = [
    { id: 'bold', icon: Bold, title: 'Bold', action: () => ts.formatText('bold'), isActive: ts.isBold, isDisabled: isInCode },
    { id: 'italic', icon: Italic, title: 'Italic', action: () => ts.formatText('italic'), isActive: ts.isItalic, isDisabled: isInCode },
    { id: 'underline', icon: Underline, title: 'Underline', action: () => ts.formatText('underline'), isActive: ts.isUnderline, isDisabled: isInCode },
    { id: 'strikethrough', icon: Strikethrough, title: 'Strikethrough', action: () => ts.formatText('strikethrough'), isActive: ts.isStrikethrough, isDisabled: isInCode },
    { id: 'superscript', icon: Superscript, title: 'Superscript', action: () => ts.formatText('superscript'), isActive: ts.isSuperscript, isDisabled: isInCode },
    { id: 'subscript', icon: Subscript, title: 'Subscript', action: () => ts.formatText('subscript'), isActive: ts.isSubscript, isDisabled: isInCode },
    { id: 'heading', icon: Heading, title: 'Heading', action: (e, a) => ts.openHeadingPicker(e, a), isActive: !!ts.headingPickerPos || ts.blockType.startsWith('h') },
    { id: 'drop-cap', icon: DropCapIcon, title: 'Drop cap', action: () => ts.toggleDropCap(), isActive: ts.isDropCap, isDisabled: !ts.canDropCap },
    { id: 'font-color', icon: Palette, title: 'Font color', action: (e, a) => ts.openColorFromMenu(e, a), isActive: !!ts.colorPickerPos, isDisabled: isInCode },
    { id: 'highlight', icon: Highlighter, title: 'Highlight', action: (e, a) => ts.openHighlightFromMenu(e, a), isActive: !!ts.highlightPickerPos, isDisabled: isInCode },
    { id: 'font-family', icon: Type, title: 'Font', action: (e, a) => ts.openFontPickerFromMenu(e, a), isActive: !!ts.fontPickerPos, isDisabled: isInCode },
    { id: 'font-size', icon: FontSizeIcon, title: 'Font size', action: (e, a) => ts.openFontSizeFromMenu(e, a), isActive: isToolbarActive(!!ts.fontSizePos, ts.fontSize, '12'), isDisabled: isInCode },
  ];

  const listsRow: ToolbarBtn[] = [
    { id: 'bullet-list', icon: List, title: 'Bullet list', action: () => ts.formatBulletList(), isActive: ts.blockType === 'bullet' },
    { id: 'numbered-list', icon: ListOrdered, title: 'Numbered list', action: () => ts.formatNumberedList(), isActive: ts.blockType === 'number' },
    { id: 'checklist', icon: ListChecks, title: 'Checklist', action: (e, a) => ts.openChecklistDropdown(e, a), isActive: ts.blockType === 'check' || ts.blockType === 'timer-checkbox' || !!ts.checklistDropdownPos },
    { id: 'quote', icon: Quote, title: 'Quote', action: () => ts.formatQuote(), isActive: ts.blockType === 'quote' },
    {
      id: 'code', icon: CodeToolIcon, title: 'Code', isActive: isInCode,
      action: (e, a) => {
        if (isInCode && canCodeLang) ts.openCodeLangPicker(e, a);
        else ts.formatCode(canCodeLang ? undefined : 'plain');
      },
    },
  ];

  const layoutRow: ToolbarBtn[] = [
    { id: 'align-left', icon: AlignLeft, title: 'Align left', action: () => ts.formatAlignment('left'), isDisabled: isInCode },
    { id: 'align-center', icon: AlignCenter, title: 'Center', action: () => ts.formatAlignment('center'), isDisabled: isInCode },
    { id: 'align-right', icon: AlignRight, title: 'Align right', action: () => ts.formatAlignment('right'), isDisabled: isInCode },
    { id: 'align-justify', icon: AlignJustify, title: 'Justify', action: () => ts.formatAlignment('justify'), isDisabled: isInCode },
    { id: 'line-height', icon: ListChevronsUpDown, title: 'Line spacing', action: (e, a) => ts.openLineHeightFromMenu(e, a), isActive: isToolbarActive(!!ts.lineHeightPickerPos, ts.lineHeight, '1.5'), isDisabled: isInCode },
    { id: 'indent', icon: IndentIncrease, title: 'Increase indent', action: () => ts.indentContent() },
    { id: 'outdent', icon: IndentDecrease, title: 'Decrease indent', action: () => ts.outdentContent(), isDisabled: !ts.canOutdent },
  ];

  const insertRow: ToolbarBtn[] = [
    { id: 'attach', icon: Paperclip, title: 'Attach file', action: () => ts.insertAttachment(), isDisabled: isInCode || !noteId },
    { id: 'image', icon: Image, title: 'Insert image', action: () => ts.insertImage(), isDisabled: isInCode },
    { id: 'divider', icon: Minus, title: 'Horizontal rule', action: () => ts.insertHorizontalRule(), isDisabled: isInCode },
    { id: 'table', icon: Table, title: 'Table', action: () => (ts.isInTable ? ts.removeTable() : ts.setShowTableModal(true)), isActive: ts.isInTable, isDisabled: isInCode },
    { id: 'dictate', icon: Mic, title: 'Dictate', action: () => dictation.toggleDictation(), isActive: dictation.isRecording, isDisabled: !dictation.isSupported },
    { id: 'summarize', icon: Sparkles, title: 'Summarize with AI', action: () => void summarizer.startSummarize(), isDisabled: ts.wordCount === 0 },
  ];

  const historyRow: ToolbarBtn[] = [
    { id: 'undo', icon: Undo, title: 'Undo (Ctrl+Z)', action: () => ts.undoAction(), isDisabled: !ts.canUndo },
    { id: 'redo', icon: Redo, title: 'Redo (Ctrl+Y)', action: () => ts.redoAction(), isDisabled: !ts.canRedo },
  ];

  const registry = new Map<string, ToolbarBtn>();
  for (const btn of [...editRow, ...listsRow, ...layoutRow, ...insertRow, ...historyRow]) registry.set(btn.id, btn);
  if (onInfo) registry.set('info', { id: 'info', icon: Info, title: 'Info', action: () => onInfo() });
  if (onVersionHistory) registry.set('version-history', { id: 'version-history', icon: History, title: 'Version History', action: () => onVersionHistory() });

  const anyToolActive = [...registry.values()].some((btn) => !!btn.isActive);

  return { editRow, listsRow, layoutRow, insertRow, historyRow, registry, anyToolActive };
}
