import { ReactNode, useRef, useEffect, createContext } from 'react';
import { Check } from 'lucide-react';
import { CheckResetOverlay } from './CheckResetOverlay';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { HeadingNode, QuoteNode, $isQuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { ListItemNode, ListNode, $isListNode, $isListItemNode, $createListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { ImageNode } from '../nodes/ImageNode';
import ImagesPlugin from '../plugins/ImagePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import {
  $getRoot,
  $insertNodes,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $isParagraphNode,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_NORMAL,
  INDENT_CONTENT_COMMAND,
  LexicalNode,
} from 'lexical';

// Provides the onChange callback to decorator nodes (e.g. ImageComponent) so they
// can push content updates synchronously without going through OnChangePlugin.
export const LexicalOnChangeContext = createContext<((html: string) => void) | null>(null);

interface LexicalEditorWrapperProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
  toolbar?: ReactNode;
  key?: string;
}

const editorTheme = {
  ltr: 'ltr',
  rtl: 'rtl',
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
    h4: 'editor-heading-h4',
    h5: 'editor-heading-h5',
    h6: 'editor-heading-h6',
  },
  list: {
    nested: {
      listitem: 'editor-nested-listitem',
    },
    ol: 'editor-list-ol',
    ul: 'editor-list-ul',
    listitem: 'editor-listitem',
    listitemChecked: 'editor-listitem-checked',
    listitemUnchecked: 'editor-listitem-unchecked',
  },
  image: 'editor-image',
  link: 'editor-link',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    overflowed: 'editor-text-overflowed',
    hashtag: 'editor-text-hashtag',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    underlineStrikethrough: 'editor-text-underlineStrikethrough',
    code: 'editor-text-code',
  },
  code: 'editor-code',
  codeHighlight: {
    atrule: 'editor-tokenAttr',
    attr: 'editor-tokenAttr',
    boolean: 'editor-tokenProperty',
    builtin: 'editor-tokenSelector',
    cdata: 'editor-tokenComment',
    char: 'editor-tokenSelector',
    class: 'editor-tokenFunction',
    'class-name': 'editor-tokenFunction',
    comment: 'editor-tokenComment',
    constant: 'editor-tokenProperty',
    deleted: 'editor-tokenProperty',
    doctype: 'editor-tokenComment',
    entity: 'editor-tokenOperator',
    function: 'editor-tokenFunction',
    important: 'editor-tokenVariable',
    inserted: 'editor-tokenSelector',
    keyword: 'editor-tokenAttr',
    namespace: 'editor-tokenVariable',
    number: 'editor-tokenProperty',
    operator: 'editor-tokenOperator',
    prolog: 'editor-tokenComment',
    property: 'editor-tokenProperty',
    punctuation: 'editor-tokenPunctuation',
    regex: 'editor-tokenVariable',
    selector: 'editor-tokenSelector',
    string: 'editor-tokenSelector',
    symbol: 'editor-tokenProperty',
    tag: 'editor-tokenProperty',
    url: 'editor-tokenOperator',
    variable: 'editor-tokenVariable',
  },
};

function onError(error: Error) {
  console.error(error);
}

// Plugin to load initial content on mount.
// Also reads data-reset-id attributes from the HTML and restores them on the
// rendered DOM elements after Lexical commits, so timer assignments survive reloads.
function InitialContentPlugin({ content }: { content: string }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const parser = new DOMParser();
    const dom = parser.parseFromString(content || '<p></p>', 'text/html');

    // Collect reset IDs (indexed by position among all checklist <li> elements)
    const resetIds: string[] = [];
    dom.querySelectorAll<HTMLElement>('li[aria-checked]').forEach(el => {
      resetIds.push(el.dataset.resetId ?? '');
    });

    // Register update listener BEFORE the update so we catch the first DOM commit
    const hasAny = resetIds.some(Boolean);
    let unregister: (() => void) | undefined;
    if (hasAny) {
      unregister = editor.registerUpdateListener(() => {
        unregister?.();
        unregister = undefined;
        const rootEl = editor.getRootElement();
        if (!rootEl) return;
        const domItems = rootEl.querySelectorAll<HTMLElement>(
          'li.editor-listitem-checked, li.editor-listitem-unchecked'
        );
        domItems.forEach((el, i) => {
          if (resetIds[i]) el.dataset.resetId = resetIds[i];
        });
      });
    }

    editor.update(() => {
      const nodes = $generateNodesFromDOM(editor, dom);
      $getRoot().clear();
      $insertNodes(nodes);
    });

    return () => unregister?.();
  }, [editor]);

  return null;
}

// Plugin to handle content changes from user typing.
// After generating HTML, injects data-reset-id attributes from the live DOM so
// timer assignments are persisted inside the note's content string.
function ChangePlugin({ onChange }: { onChange: (html: string) => void }) {
  const [editor] = useLexicalComposerContext();

  const handleChange = () => {
    editor.read(() => {
      let html = $generateHtmlFromNodes(editor);

      const rootEl = editor.getRootElement();
      if (rootEl) {
        const domItems = Array.from(rootEl.querySelectorAll<HTMLElement>(
          'li.editor-listitem-checked, li.editor-listitem-unchecked'
        ));
        const hasResetIds = domItems.some(el => el.dataset.resetId);

        if (hasResetIds) {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const htmlItems = doc.querySelectorAll<HTMLElement>('li[aria-checked]');
          domItems.forEach((domEl, i) => {
            const id = domEl.dataset.resetId;
            if (id && htmlItems[i]) htmlItems[i].dataset.resetId = id;
          });
          html = doc.body.innerHTML;
        }
      }

      onChange(html);
    });
  };

  return <OnChangePlugin onChange={handleChange} ignoreSelectionChange />;
}

// Plugin to enable multiline blockquotes
function MultilineQuotePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Handle Enter key in quotes
    const removeEnterListener = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event: KeyboardEvent | null) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }

        const anchorNode = selection.anchor.getNode();
        let element = anchorNode;

        // Find the parent element (could be paragraph inside quote)
        if ($isParagraphNode(element)) {
          const parent = element.getParent();
          if (parent && $isQuoteNode(parent)) {
            element = parent;
          }
        }

        // If parent is quote node, we're in a quote
        const parentElement = element.getParent();
        if ($isQuoteNode(element) || ($isQuoteNode(parentElement))) {
          const quoteNode = $isQuoteNode(element) ? element : parentElement!;

          // Don't handle if shift is pressed (let default soft break happen)
          if (event?.shiftKey) {
            return false;
          }

          // Check if current paragraph is empty
          const currentNode = $isParagraphNode(anchorNode) ? anchorNode : anchorNode.getParent();
          if (currentNode && $isParagraphNode(currentNode)) {
            const textContent = currentNode.getTextContent();

            // If current line is empty and it's the last child, exit the quote
            if (textContent.trim() === '' && currentNode === quoteNode.getLastChild()) {
              event?.preventDefault();

              // Remove the empty paragraph
              currentNode.remove();

              // Create new paragraph after quote
              const newParagraph = $createParagraphNode();
              quoteNode.insertAfter(newParagraph);
              newParagraph.select();

              return true;
            }
          }

          // Create new paragraph inside quote
          event?.preventDefault();
          const newParagraph = $createParagraphNode();

          // Insert after current paragraph
          if (currentNode && $isParagraphNode(currentNode)) {
            currentNode.insertAfter(newParagraph);
          } else {
            quoteNode.append(newParagraph);
          }

          newParagraph.select();
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_HIGH
    );

    // Handle Escape key to exit quote
    const removeEscapeListener = editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      (event: KeyboardEvent) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }

        const anchorNode = selection.anchor.getNode();
        let element = anchorNode;

        // Find the quote node
        if ($isParagraphNode(element)) {
          const parent = element.getParent();
          if (parent && $isQuoteNode(parent)) {
            element = parent;
          }
        }

        const parentElement = element.getParent();
        if ($isQuoteNode(element) || ($isQuoteNode(parentElement))) {
          const quoteNode = $isQuoteNode(element) ? element : parentElement!;

          event.preventDefault();

          // Create new paragraph after quote
          const newParagraph = $createParagraphNode();
          quoteNode.insertAfter(newParagraph);
          newParagraph.select();

          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_HIGH
    );

    return () => {
      removeEnterListener();
      removeEscapeListener();
    };
  }, [editor]);

  return null;
}

// Overrides INDENT_CONTENT_COMMAND for checklist items so that indenting nests
// the item directly under its previous sibling — instead of Lexical's default
// which wraps it in a new empty ListItemNode (showing a phantom checkbox).
function CheckListIndentPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      INDENT_CONTENT_COMMAND,
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;

        let node: LexicalNode | null = selection.anchor.getNode();
        while (node !== null && !$isListItemNode(node)) {
          node = node.getParent();
        }
        if (!$isListItemNode(node)) return false;

        const parentList = node.getParent();
        if (!$isListNode(parentList) || parentList.getListType() !== 'check') return false;

        const prevSibling = node.getPreviousSibling();
        if (!$isListItemNode(prevSibling)) return false; // no prev sibling → fall through to Lexical default

        const prevLastChild = prevSibling.getLastChild();
        if ($isListNode(prevLastChild) && prevLastChild.getListType() === 'check') {
          prevLastChild.append(node);
        } else {
          const newList = $createListNode('check');
          newList.append(node);
          prevSibling.append(newList);
        }
        return true;
      },
      COMMAND_PRIORITY_NORMAL,
    );
  }, [editor]);

  return null;
}

const LexicalEditorWrapper = ({
  content,
  onChange,
  placeholder = "Beginne zu schreiben...",
  disabled = false,
  toolbar,
}: LexicalEditorWrapperProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const checkIconRef = useRef<HTMLDivElement>(null);

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
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      AutoLinkNode,
      LinkNode,
      ImageNode,
    ],
  };

  return (
    <LexicalOnChangeContext.Provider value={onChange}>
    <>
      <style>{`
        .editor-container {
          position: relative;
          color: var(--color-accent-900);
          font-size: 16px;
          line-height: 1.6;
          isolation: isolate;
          transform: translateZ(0);
        }

        .editor-input {
          min-height: 200px;
          resize: none;
          font-size: 16px;
          caret-color: var(--color-accent-500);
          position: relative;
          tab-size: 1;
          outline: 0;
          padding: 0;
          background: transparent;
          color: var(--color-accent-900);
        }

        .editor-placeholder {
          color: color-mix(in srgb, var(--color-brand-primary) 45%, transparent);
          overflow: hidden;
          position: absolute;
          text-overflow: ellipsis;
          top: 0;
          left: 0;
          font-size: 16px;
          user-select: none;
          display: inline-block;
          pointer-events: none;
        }

        .editor-paragraph {
          margin: 0;
          position: relative;
        }

        .editor-quote {
          margin: 16px 0;
          padding: 12px 16px;
          border-left: 4px solid var(--color-accent-500);
          background-color: color-mix(in srgb, var(--color-accent-500) 5%, transparent);
          border-radius: 4px;
          color: var(--color-accent-800);
          font-style: italic;
        }

        .editor-heading-h1 {
          font-size: 2em;
          font-weight: 700;
          margin: 0.67em 0;
          color: var(--color-accent-900);
        }

        .editor-heading-h2 {
          font-size: 1.5em;
          font-weight: 700;
          margin: 0.75em 0;
          color: var(--color-accent-900);
        }

        .editor-heading-h3 {
          font-size: 1.25em;
          font-weight: 700;
          margin: 0.83em 0;
          color: var(--color-accent-900);
        }

        .editor-heading-h4 {
          font-size: 1.1em;
          font-weight: 700;
          margin: 0.9em 0;
          color: var(--color-accent-900);
        }

        .editor-heading-h5 {
          font-size: 0.95em;
          font-weight: 700;
          margin: 1em 0;
          color: var(--color-accent-900);
        }

        .editor-heading-h6 {
          font-size: 0.85em;
          font-weight: 700;
          margin: 1em 0;
          color: var(--color-accent-800);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .editor-list-ol {
          list-style-type: decimal;
          margin-left: 20px;
          margin-top: 0;
          margin-bottom: 0;
          padding: 0;
        }

        .editor-list-ul {
          list-style-type: disc;
          margin-left: 20px;
          margin-top: 0;
          margin-bottom: 0;
          padding: 0;
        }

        .editor-listitem {
          margin-bottom: 0;
          color: var(--color-accent-900);
        }

        .editor-listitem::marker {
          color: var(--color-accent-700);
        }

        .editor-listitem-unchecked::marker,
        .editor-listitem-checked::marker {
          display: none;
        }

        /* Hide the checkbox for Lexical's phantom wrapper nodes: list items that only
           contain a nested <ul> and no <span> (text always renders as <span> in Lexical).
           These are created by the default indent logic when there is no previous sibling. */
        li.editor-listitem-unchecked:has(> ul):not(:has(> :not(ul))):before,
        li.editor-listitem-checked:has(> ul):not(:has(> :not(ul))):before {
          display: none;
        }

        .editor-nested-listitem {
          list-style-type: none;
        }

        /* Remove the extra left margin that editor-list-ul adds for top-level checklists.
           Nested checklist <ul> elements (whose direct children have editor-nested-listitem)
           are not matched here, so they keep margin-left: 20px for visual nesting. */
        ul.editor-list-ul:has(> li.editor-listitem.editor-listitem-unchecked),
        ul.editor-list-ul:has(> li.editor-listitem.editor-listitem-checked) {
          margin-left: 0;
        }

        .editor-listitem-checked,
        .editor-listitem-unchecked {
          position: relative;
          list-style-type: none;
          padding-left: 26px;
          outline: none;
        }
        .editor-listitem-checked {
          text-decoration: line-through;
        }
        .editor-listitem-checked > span {
          opacity: 0.55;
        }

        /* Circle — width is read by CheckListPlugin via getComputedStyle(::before).width
           to determine the clickable checkbox area, so keep width accurate. */
        .editor-listitem-unchecked::before,
        .editor-listitem-checked::before {
          content: '';
          width: 18px;
          height: 18px;
          top: 4px;
          left: 0;
          cursor: pointer;
          display: block;
          position: absolute;
          border-radius: 50%;
          border: 1.5px solid var(--color-text-primary, #e5e5e5);
          background-color: transparent;
          box-sizing: border-box;
          transition: background-color 0.22s ease;
        }
        .editor-listitem-checked::before {
          background-color: var(--color-text-primary, #e5e5e5);
        }

        /* Lucide Check icon — rendered via CSS mask-image using the SVG extracted from
           the actual Lucide <Check /> component (set as --check-icon-mask on :root). */
        .editor-listitem-checked::after {
          content: '';
          position: absolute;
          pointer-events: none;
          left: 3px;
          top: 7.3px;
          width: 12px;
          height: 12px;
          background-color: var(--color-bg-primary, #737373);
          -webkit-mask-image: var(--check-icon-mask, none);
          mask-image: var(--check-icon-mask, none);
          -webkit-mask-size: contain;
          mask-size: contain;
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
          -webkit-mask-position: center;
          mask-position: center;
          clip-path: inset(0 100% 0 0);
          animation: drawCheck 0.28s ease-out 0.1s both;
        }
        @keyframes drawCheck {
          from { clip-path: inset(0 100% 0 0); }
          to   { clip-path: inset(0 0% 0 0); }
        }

        /* Progress ring for unchecked checklist items with an auto-reset timer.
           --ring-angle is set by CheckResetOverlay via JS (requestAnimationFrame).
           Default 0deg = no ring (invisible until JS fires). The clockwise draw
           animation and ongoing counterclockwise erase are both driven from JS. */
        li.editor-listitem-unchecked[data-reset-id]::after {
          content: '';
          position: absolute;
          width: 22px;
          height: 22px;
          top: 2px;
          left: -2px;
          border-radius: 50%;
          pointer-events: none;
          background: conic-gradient(
            from -90deg,
            var(--color-text-primary) var(--ring-angle, 0deg),
            transparent var(--ring-angle, 0deg)
          );
          -webkit-mask-image: radial-gradient(circle at center, transparent 9px, black 9.5px, black 10.5px, transparent 11px);
          mask-image: radial-gradient(circle at center, transparent 9px, black 9.5px, black 10.5px, transparent 11px);
        }

        /* Subtle static outline for checked items with a timer.
           (::after is occupied by the checkmark, so we use ::before outline.) */
        li.editor-listitem-checked[data-reset-id]::before {
          outline: 1.5px solid color-mix(in srgb, var(--color-text-primary) 35%, transparent);
          outline-offset: 2px;
        }

        .editor-link {
          color: var(--color-accent-500);
          text-decoration: underline;
          cursor: pointer;
        }

        .editor-link:hover {
          color: var(--color-accent-600);
        }

        .editor-link:visited {
          color: var(--color-accent-700);
        }

        .editor-text-bold {
          font-weight: 700;
        }

        .editor-text-italic {
          font-style: italic;
        }

        .editor-text-underline {
          text-decoration: underline;
        }

        .editor-text-strikethrough {
          text-decoration: line-through;
        }

        .editor-text-underlineStrikethrough {
          text-decoration: underline line-through;
        }

        .editor-text-code {
          background-color: rgba(107, 114, 128, 0.1);
          padding: 2px 4px;
          border-radius: 3px;
          font-family: monospace;
          font-size: 0.9em;
        }

        .editor-code {
          background-color: rgba(17, 24, 39, 0.8);
          color: #ffffff;
          font-family: Menlo, Consolas, Monaco, monospace;
          display: block;
          padding: 12px;
          line-height: 1.5;
          font-size: 0.9em;
          margin: 16px 0;
          tab-size: 2;
          overflow-x: auto;
          position: relative;
          border-radius: 4px;
          border: 1px solid rgba(75, 85, 99, 0.3);
        }

        .editor-tokenComment {
          color: #6b7280;
        }

        .editor-tokenPunctuation {
          color: #9ca3af;
        }

        .editor-tokenProperty {
          color: #fbbf24;
        }

        .editor-tokenSelector {
          color: #34d399;
        }

        .editor-tokenOperator {
          color: #60a5fa;
        }

        .editor-tokenAttr {
          color: #a78bfa;
        }

        .editor-tokenVariable {
          color: #f87171;
        }

        .editor-tokenFunction {
          color: #fb923c;
        }

        .editor-image {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          margin: 8px 0;
        }

      `}</style>

      {/* Hidden container — renders the Lucide Check icon so its SVG can be extracted
          by the useEffect above and used as a CSS mask-image on ::after. */}
      <div ref={checkIconRef} style={{ display: 'none' }} aria-hidden="true">
        <Check size={24} strokeWidth={2.5} />
      </div>

      <LexicalComposer initialConfig={initialConfig}>
        <InitialContentPlugin content={content} />
        <ChangePlugin onChange={onChange} />
        <MultilineQuotePlugin />
        <CheckListIndentPlugin />

        {/* Toolbar */}
        {toolbar}

        {/* Editor */}
        <div className="relative flex-1 min-h-0">
          <div ref={scrollRef} className="absolute inset-0 scrollbar-overlay px-12 pt-8 pb-8 bg-transparent overflow-y-auto" style={{ isolation: 'isolate' }}>
            <div className="editor-container">
              <RichTextPlugin
                contentEditable={<ContentEditable className="editor-input" />}
                placeholder={<div className="editor-placeholder">{placeholder}</div>}
                ErrorBoundary={LexicalErrorBoundary}
              />
              <HistoryPlugin />
              <AutoFocusPlugin />
              <ListPlugin />
              <CheckListPlugin />
              <LinkPlugin />
              <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
              <ImagesPlugin />
              <CheckResetOverlay />
            </div>
          </div>
          {/* Top scroll fade – softens text appearing directly beneath the toolbar */}
          <div
            className="absolute top-0 left-0 pointer-events-none z-10"
            style={{
              right: '10px',
              height: '100px',
              background: 'linear-gradient(to bottom, color-mix(in srgb, var(--color-bg-secondary) 100%, black 10%), transparent 50%)',
            }}
          />
        </div>
      </LexicalComposer>
    </>
    </LexicalOnChangeContext.Provider>
  );
};

export default LexicalEditorWrapper;
