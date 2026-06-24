import { ReactNode, useRef, useEffect, useLayoutEffect, createContext } from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import clsx from 'clsx';
import type Lenis from 'lenis';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { AutoLinkPlugin } from '@lexical/react/LexicalAutoLinkPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import { $generateNodesFromDOM } from '@lexical/html';
import { $getRoot, $insertNodes, LexicalEditor } from 'lexical';
import { TimerCheckboxPlugin } from './CheckResetOverlay';
import { TimerListItemNode } from './TimerListItemNode';
import { DropCapParagraphNode } from './DropCapParagraphNode';
import { ImageNode } from './ImageNode';
import ImagesPlugin from './ImagePlugin';
import { ActiveLinePlugin } from './ActiveLinePlugin';
import { editorTheme, htmlImport, URL_MATCHERS, onError } from './editorConfig';
import {
  ChangePlugin,
  CheckListIndentPlugin,
  CodeHighlightPlugin,
  FocusAtEndPlugin,
  LineHeightSyncPlugin,
  LinkClickPlugin,
  MultilineQuotePlugin,
  TabIndentPlugin,
} from './corePlugins';
import { YjsSyncPlugin, type ActiveUser } from './YjsSyncPlugin';
import TableOfContents from './TableOfContents';
import { useLenisScroll } from '../../hooks/useLenisScroll';

export type { ActiveUser };

// Provides the onChange callback to decorator nodes (e.g. ImageComponent) so they
// can push content updates synchronously without going through ChangePlugin.
export const LexicalOnChangeContext = createContext<((html: string) => void) | null>(null);

export interface CollaborationConfig {
  noteId: string;
  token: string;
  userId: string;
  username: string;
  cursorColor: string;
  // Drives the presence label: viewers are shown as "viewing", not "editing".
  canEdit: boolean;
}

interface LexicalEditorWrapperProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
  toolbar?: ReactNode;
  headerSlot?: ReactNode;
  key?: string;
  collaboration?: CollaborationConfig | null;
  onUsersChange?: (users: ActiveUser[]) => void;
  // Hides the table-of-contents column while distraction-free writing is on.
  focusMode?: boolean;
}

const LexicalEditorWrapper = ({
  content,
  onChange,
  placeholder = "Beginne zu schreiben...",
  disabled = false,
  toolbar,
  headerSlot,
  collaboration = null,
  onUsersChange,
  focusMode = false,
}: LexicalEditorWrapperProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const checkIconRef = useRef<HTMLDivElement>(null);
  const cursorsContainerRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  useLenisScroll(scrollRef, scrollContentRef, undefined, lenisRef);
  const onUsersChangeRef = useRef(onUsersChange);
  useLayoutEffect(() => { onUsersChangeRef.current = onUsersChange; });

  const contentRef = useRef(content);
  useLayoutEffect(() => { contentRef.current = content; });

  // Freeze the writing column at the available panel width: window resizes must
  // not rewrap the text (the canvas scrolls horizontally instead — see
  // .editor-canvas > div CSS), but internal layout changes like the sidebar
  // toggle SHOULD re-measure. A panel resize without a recent window resize
  // event is such an internal change.
  useLayoutEffect(() => {
    const canvas = scrollRef.current;
    if (!canvas) return;
    const available = () => {
      const cs = getComputedStyle(canvas);
      return canvas.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    };
    const measure = () => {
      const w = available();
      if (w > 0) canvas.style.setProperty('--editor-content-w', `${w}px`);
    };
    measure();
    let windowResizedAt = 0;
    // Window resize: only re-measure when the panel GREW. Growing lets the column
    // widen back to the new available width (otherwise it stays stuck at whatever
    // width it had on mount — e.g. after reloading with a small window). Shrinking
    // stays frozen so the text never rewraps; the canvas scrolls horizontally.
    const onWindowResize = () => {
      windowResizedAt = performance.now();
      const current = parseFloat(canvas.style.getPropertyValue('--editor-content-w')) || 0;
      if (available() > current) measure();
    };
    window.addEventListener('resize', onWindowResize);
    const ro = new ResizeObserver(() => {
      if (performance.now() - windowResizedAt > 200) measure();
    });
    ro.observe(canvas);
    return () => {
      window.removeEventListener('resize', onWindowResize);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Extract the rendered Lucide Check SVG and set it as a CSS mask variable.
  // This runs once per mount so every ::after can use the exact Lucide icon shape.
  useEffect(() => {
    const svg = checkIconRef.current?.querySelector('svg');
    if (!svg) return;
    const uri = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}")`;
    document.documentElement.style.setProperty('--check-icon-mask', uri);
  }, []);

  const initialConfig = {
    namespace: 'DendriteEditor',
    theme: editorTheme,
    onError,
    editable: !disabled,
    html: { import: htmlImport },
    nodes: [
      DropCapParagraphNode,
      HeadingNode,
      ListNode,
      ListItemNode,
      TimerListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      HorizontalRuleNode,
      AutoLinkNode,
      LinkNode,
      ImageNode,
    ],
    editorState: (editor: LexicalEditor) => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(content || '<p></p>', 'text/html');
      const nodes = $generateNodesFromDOM(editor, dom);
      $getRoot().clear();
      $insertNodes(nodes);
    },
  };

  return (
    <LexicalOnChangeContext.Provider value={onChange}>
    <>
      {/* Hidden container — renders the Lucide Check icon so its SVG can be extracted
          by the useEffect above and used as a CSS mask-image on ::after. */}
      <div ref={checkIconRef} style={{ display: 'none' }} aria-hidden="true">
        <Check size={24} strokeWidth={2.5} />
      </div>

      <LexicalComposer initialConfig={initialConfig}>
        <div className="flex h-full min-h-0 flex-1 flex-col">
          <ChangePlugin onChange={onChange} />
          <MultilineQuotePlugin />
          <CheckListIndentPlugin />
          <TabIndentPlugin />

          <div className="@container relative flex min-h-0 flex-1 overflow-hidden">
            <div
              className="editor-info-column pointer-events-none absolute inset-y-0 left-0 w-20"
              style={{
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.06) 18px, rgba(0,0,0,0.35) 48px, rgb(0,0,0) 72px, rgb(0,0,0) calc(100% - 72px), rgba(0,0,0,0.35) calc(100% - 48px), rgba(0,0,0,0.06) calc(100% - 18px), transparent 100%)',
                maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.06) 18px, rgba(0,0,0,0.35) 48px, rgb(0,0,0) 72px, rgb(0,0,0) calc(100% - 72px), rgba(0,0,0,0.35) calc(100% - 48px), rgba(0,0,0,0.06) calc(100% - 18px), transparent 100%)',
              }}
            />
            <div
              ref={scrollRef}
              className="editor-canvas min-w-0 grow"
            >
              <motion.div
                ref={scrollContentRef}
                initial={{ y: 6 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
              {headerSlot && (
                <div className="w-full pt-6">
                  {headerSlot}
                </div>
              )}
              <div className="editor-container w-full" style={{ position: 'relative' }}>
                {collaboration && (
                  <div
                    ref={cursorsContainerRef}
                    style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible', zIndex: 10 }}
                  />
                )}
                <RichTextPlugin
                  contentEditable={<ContentEditable className="editor-input editor-body" />}
                  placeholder={<div className="editor-placeholder">{placeholder}</div>}
                  ErrorBoundary={LexicalErrorBoundary}
                />
                <HistoryPlugin delay={0} />
                {collaboration && (
                  <YjsSyncPlugin
                    noteId={collaboration.noteId}
                    token={collaboration.token}
                    userId={collaboration.userId}
                    username={collaboration.username}
                    cursorColor={collaboration.cursorColor}
                    canEdit={collaboration.canEdit}
                    contentRef={contentRef}
                    onUsersChangeRef={onUsersChangeRef}
                    cursorsContainerRef={cursorsContainerRef}
                  />
                )}
                <FocusAtEndPlugin />
                <ListPlugin />
                <CheckListPlugin />
                <LinkPlugin />
                <AutoLinkPlugin matchers={URL_MATCHERS} />
                <LinkClickPlugin />
                <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
                <ImagesPlugin />
                <HorizontalRulePlugin />
                <TablePlugin hasCellMerge={false} hasCellBackgroundColor={false} />
                <CodeHighlightPlugin />
                <TimerCheckboxPlugin />
                <LineHeightSyncPlugin />
                <ActiveLinePlugin />
              </div>
              </motion.div>
            </div>

            {/* Table-of-contents column — its width collapses to 0 when the note
                has <2 headings. Shown via a container query on the editor area (not
                the viewport) so it tracks the real available width regardless of the
                sidebar/note-list; hidden in focus mode. Threshold ≈ TOC column +
                canvas padding + a comfortable text measure. */}
            <div
              className={clsx(
                'hidden shrink-0 flex-col justify-center transition-opacity duration-500 ease-out @min-[940px]:flex',
                focusMode ? 'pointer-events-none opacity-0' : 'opacity-100',
              )}
            >
              <TableOfContents scrollRef={scrollRef} lenisRef={lenisRef} />
            </div>
          </div>

          {toolbar && (
            <div className="relative z-2 min-h-0 shrink-0 bg-transparent">
              {toolbar}
            </div>
          )}
        </div>
      </LexicalComposer>
    </>
    </LexicalOnChangeContext.Provider>
  );
};

export default LexicalEditorWrapper;
