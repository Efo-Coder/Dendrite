import { ReactNode, useRef, useEffect, useLayoutEffect, createContext } from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import {
  createBinding,
  syncLexicalUpdateToYjs,
  syncYjsChangesToLexical,
  initLocalState,
  setLocalStateFocus,
} from '@lexical/yjs';
import { TimerCheckboxPlugin } from './CheckResetOverlay';
import { TimerListItemNode } from './TimerListItemNode';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { HeadingNode, QuoteNode, $isQuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { ListItemNode, ListNode, $isListNode, $isListItemNode, $createListNode } from '@lexical/list';

import { CodeHighlightNode, CodeNode, registerCodeHighlighting } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { ImageNode } from './ImageNode';
import ImagesPlugin from './ImagePlugin';
import { ActiveLinePlugin } from './ActiveLinePlugin';
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
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import {
  $getRoot,
  $insertNodes,
  $getSelection,
  $isRangeSelection,
  $isElementNode,
  $isRootNode,
  $createParagraphNode,
  $isParagraphNode,
  $isTextNode,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_NORMAL,
  COMMAND_PRIORITY_EDITOR,
  FOCUS_COMMAND,
  BLUR_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  SKIP_COLLAB_TAG,
  LexicalNode,
  LexicalEditor,
} from 'lexical';

// Provides the onChange callback to decorator nodes (e.g. ImageComponent) so they
// can push content updates synchronously without going through ChangePlugin.
export const LexicalOnChangeContext = createContext<((html: string) => void) | null>(null);

export interface CollaborationConfig {
  noteId: string;
  token: string;
  username: string;
  cursorColor: string;
}

export interface ActiveUser {
  clientID: number;
  name: string;
  color: string;
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
}

// Custom span importer: Lexical's default applyTextFormatFromStyle ignores color,
// background-color, font-family, font-size. This converter (priority 1) restores them.
const htmlImport = {
  span: (domNode: HTMLElement) => {
    const style = domNode.style;
    const color = style.color;
    const backgroundColor = style.backgroundColor;
    const fontFamily = style.fontFamily;
    const fontSize = style.fontSize;
    if (!color && !backgroundColor && !fontFamily && !fontSize) return null;

    return {
      conversion: (el: HTMLElement) => {
        const s = el.style;
        const fontWeight = s.fontWeight;
        const textDeco = s.textDecoration ? s.textDecoration.split(' ') : [];
        const hasBold = fontWeight === '700' || fontWeight === 'bold';
        const hasStrike = textDeco.includes('line-through');
        const hasItalic = s.fontStyle === 'italic';
        const hasUnder = textDeco.includes('underline');
        const vAlign = s.verticalAlign;
        const parts: string[] = [];
        if (s.color) parts.push(`color: ${s.color}`);
        if (s.backgroundColor) parts.push(`background-color: ${s.backgroundColor}`);
        if (s.fontFamily) parts.push(`font-family: ${s.fontFamily}`);
        if (s.fontSize) parts.push(`font-size: ${s.fontSize}`);
        const inlineStyle = parts.join('; ');
        return {
          node: null,
          forChild: (lexicalNode: LexicalNode) => {
            if (!$isTextNode(lexicalNode)) return lexicalNode;
            if (hasBold && !lexicalNode.hasFormat('bold')) lexicalNode.toggleFormat('bold');
            if (hasStrike && !lexicalNode.hasFormat('strikethrough')) lexicalNode.toggleFormat('strikethrough');
            if (hasItalic && !lexicalNode.hasFormat('italic')) lexicalNode.toggleFormat('italic');
            if (hasUnder && !lexicalNode.hasFormat('underline')) lexicalNode.toggleFormat('underline');
            if (vAlign === 'sub' && !lexicalNode.hasFormat('subscript')) lexicalNode.toggleFormat('subscript');
            if (vAlign === 'super' && !lexicalNode.hasFormat('superscript')) lexicalNode.toggleFormat('superscript');
            if (inlineStyle) {
              const cur = lexicalNode.getStyle();
              lexicalNode.setStyle(cur ? `${cur}; ${inlineStyle}` : inlineStyle);
            }
            return lexicalNode;
          },
        };
      },
      priority: 1 as const,
    };
  },
};

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
  hr: 'editor-hr',
  image: 'editor-image',
  link: 'editor-link',
  table: 'editor-table',
  tableRow: 'editor-table-row',
  tableCell: 'editor-table-cell',
  tableCellHeader: 'editor-table-cell-header',
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

// Matches http(s):// or www. URLs with a TLD of 2-13 letters (no digits → filters garbage like .abc123)
const URL_REGEX = /((https?:\/\/(www\.)?)|www\.)[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z]{2,13}(\/[-a-zA-Z0-9()@:%_+.~#?&/=]*)?/i;

const URL_MATCHERS = [
  (text: string) => {
    const match = URL_REGEX.exec(text);
    if (!match) return null;
    const raw = match[0].replace(/[.,;!?]+$/, '');
    return {
      index: match.index,
      length: raw.length,
      text: raw,
      url: raw.startsWith('http') ? raw : `https://${raw}`,
    };
  },
];

function LinkClickPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      event.preventDefault();
      window.open(anchor.href, '_blank', 'noopener,noreferrer');
    };

    return editor.registerRootListener((root, prev) => {
      prev?.removeEventListener('click', handleClick as EventListener);
      root?.addEventListener('click', handleClick as EventListener);
    });
  }, [editor]);

  return null;
}

function onError(error: Error) {
  console.error(error);
}

function FocusAtEndPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      // Focus first → Lexical's focus-event handler queues its update (X)
      // Then our selectEnd queues after (Y) → Y wins in the same batch
      editor.getRootElement()?.focus({ preventScroll: true });
      editor.update(() => {
        $getRoot().selectEnd();
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [editor]);

  return null;
}

function CodeHighlightPlugin(): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => registerCodeHighlighting(editor), [editor]);
  return null;
}


function ChangePlugin({ onChange }: { onChange: (html: string) => void }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ dirtyElements, dirtyLeaves, prevEditorState, tags }) => {
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
      if (tags.has('history-merge') || tags.has(SKIP_COLLAB_TAG) || tags.has('collaboration')) return;
      if (prevEditorState.isEmpty()) return;
      editor.read(() => {
        onChange($generateHtmlFromNodes(editor));
      });
    });
  }, [editor, onChange]);

  return null;
}

function YjsSyncPlugin({
  noteId,
  token,
  username,
  cursorColor,
  contentRef,
  onUsersChangeRef,
  cursorsContainerRef,
}: {
  noteId: string;
  token: string;
  username: string;
  cursorColor: string;
  contentRef: React.MutableRefObject<string>;
  onUsersChangeRef: React.MutableRefObject<((users: ActiveUser[]) => void) | undefined>;
  cursorsContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [editor] = useLexicalComposerContext();
  const usernameRef = useRef(username);
  const cursorColorRef = useRef(cursorColor);
  const tokenRef = useRef(token);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const providerRef = useRef<any>(null);
  useLayoutEffect(() => {
    usernameRef.current = username;
    cursorColorRef.current = cursorColor;
    tokenRef.current = token;
  });

  // Keep awareness name/color in sync if username or color changes after mount
  // (e.g. async auth resolution). @lexical/yjs's setLocalStateFocus ignores
  // name/color when localState already exists, so we update it directly.
  useEffect(() => {
    if (!providerRef.current) return;
    const awareness = providerRef.current.awareness;
    const state = awareness.getLocalState();
    if (state) awareness.setLocalState({ ...state, name: username, color: cursorColor });
  }, [username, cursorColor]);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const wsBase = apiUrl.replace(/^http/, 'ws');
    const doc = new Y.Doc();
    const docMap = new Map<string, Y.Doc>([[noteId, doc]]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provider = new WebsocketProvider(
      `${wsBase}/collaboration`,
      noteId,
      doc,
      { params: { token: tokenRef.current }, connect: false },
    ) as any;

    const binding = createBinding(editor, provider, noteId, doc, docMap);

    providerRef.current = provider;

    if (cursorsContainerRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (binding as any).cursorsContainer = cursorsContainerRef.current;
    }

    initLocalState(
      provider,
      usernameRef.current,
      cursorColorRef.current,
      document.activeElement === editor.getRootElement(),
      {},
    );

    const removeFocusCmd = editor.registerCommand(FOCUS_COMMAND, () => {
      setLocalStateFocus(provider, usernameRef.current, cursorColorRef.current, true, {});
      return false;
    }, COMMAND_PRIORITY_EDITOR);
    const removeBlurCmd = editor.registerCommand(BLUR_COMMAND, () => {
      setLocalStateFocus(provider, usernameRef.current, cursorColorRef.current, false, {});
      return false;
    }, COMMAND_PRIORITY_EDITOR);

    const onYjsTreeChanges = (events: Y.YEvent<Y.AbstractType<unknown>>[], transaction: Y.Transaction) => {
      if (transaction.origin !== binding) {
        const isFromUndoManager = transaction.origin instanceof Y.UndoManager;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        syncYjsChangesToLexical(binding, provider, events as any, isFromUndoManager);
      }
    };
    binding.root.getSharedType().observeDeep(onYjsTreeChanges);

    let synced = false;
    let firstSync = true;
    const emptyPrev = { _nodeMap: new Map(), _selection: null } as any;
    const unregisterUpdate = editor.registerUpdateListener(({
      prevEditorState, editorState, dirtyElements, dirtyLeaves, normalizedNodes, tags,
    }) => {
      if (tags.has(SKIP_COLLAB_TAG)) return;
      if (tags.has('collaboration')) {
        // Yjs→Lexical sync arrived: collabNodeMap is now populated.
        firstSync = false;
        return;
      }
      // Block ALL local→Yjs syncs until the WebSocket sync round-trip is done.
      // Without this guard, premature syncLexicalUpdateToYjs calls (e.g. from
      // FocusAtEndPlugin or Framer-Motion callbacks) create duplicate Yjs nodes
      // in an already-populated doc and cause content doubling.
      if (!synced) return;
      const prev = firstSync ? emptyPrev : prevEditorState;
      firstSync = false;
      syncLexicalUpdateToYjs(
        binding, provider, prev, editorState,
        dirtyElements, dirtyLeaves, normalizedNodes, tags,
      );
    });

    const onSync = (isSynced: boolean) => {
      if (!isSynced) return;
      synced = true; // Unlock local→Yjs syncing now that we know the server state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sharedType = binding.root.getSharedType() as any;
      if (sharedType._length === 0) {
        editor.update(() => {
          const parser = new DOMParser();
          const dom = parser.parseFromString(contentRef.current || '<p></p>', 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);
          $getRoot().clear();
          $insertNodes(nodes);
        }, { tag: SKIP_COLLAB_TAG });
      }
    };
    provider.on('sync', onSync);

    const onAwarenessChange = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const states = Array.from(provider.awareness.getStates().entries()) as [number, any][];
      const others = states
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter(([cid]: [number, any]) => cid !== provider.awareness.clientID)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map(([cid, state]: [number, any]) => ({
          clientID: cid,
          name: state.name ?? 'Anonym',
          color: state.color ?? '#888',
        }));
      onUsersChangeRef.current?.(others);
    };
    provider.awareness.on('update', onAwarenessChange);

    provider.connect();

    return () => {
      providerRef.current = null;
      removeFocusCmd();
      removeBlurCmd();
      unregisterUpdate();
      binding.root.getSharedType().unobserveDeep(onYjsTreeChanges);
      provider.off('sync', onSync);
      provider.awareness.off('update', onAwarenessChange);
      provider.disconnect();
      provider.destroy();
    };
  }, [editor, noteId]); // stable deps — kein Reconnect-Cycle

  return null;
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

// After each Lexical update, reads line-height from the first TextNode of every
// ElementNode and writes it directly to the DOM element's style. This is needed
// because Lexical's reconciler does NOT apply ElementNode.__style to the live DOM,
// and inline spans with a smaller line-height than the inherited block value are
// overridden by CSS cascade.
function LineHeightSyncPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      const map = new Map<string, string>();

      editorState.read(() => {
        function walk(node: LexicalNode): void {
          if ($isRootNode(node)) {
            for (const child of (node as any).getChildren() as LexicalNode[]) walk(child);
            return;
          }
          if ($isElementNode(node)) {
            for (const child of (node as any).getChildren() as LexicalNode[]) {
              if ($isTextNode(child)) {
                const match = /line-height\s*:\s*([^;]+)/.exec(child.getStyle());
                map.set(node.getKey(), match ? match[1].trim() : '');
                break;
              }
            }
            for (const child of (node as any).getChildren() as LexicalNode[]) walk(child);
          }
        }
        walk($getRoot());
      });

      map.forEach((lh, key) => {
        const dom = editor.getElementByKey(key) as HTMLElement | null;
        if (dom) dom.style.lineHeight = lh;
      });
    });
  }, [editor]);

  return null;
}

function TabIndentPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_TAB_COMMAND,
      (event: KeyboardEvent) => {
        event.preventDefault();
        editor.dispatchCommand(
          event.shiftKey ? OUTDENT_CONTENT_COMMAND : INDENT_CONTENT_COMMAND,
          undefined,
        );
        return true;
      },
      COMMAND_PRIORITY_NORMAL,
    );
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
  headerSlot,
  collaboration = null,
  onUsersChange,
}: LexicalEditorWrapperProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const checkIconRef = useRef<HTMLDivElement>(null);
  const cursorsContainerRef = useRef<HTMLDivElement>(null);
  const onUsersChangeRef = useRef(onUsersChange);
  useLayoutEffect(() => { onUsersChangeRef.current = onUsersChange; });

  const contentRef = useRef(content);
  useLayoutEffect(() => { contentRef.current = content; });


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

          <div className="relative flex min-h-0 flex-1 flex-col">
            <div
              className="editor-info-column pointer-events-none absolute inset-y-0 left-0 w-20"
              style={{
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.06) 18px, rgba(0,0,0,0.35) 48px, rgb(0,0,0) 72px, rgb(0,0,0) calc(100% - 72px), rgba(0,0,0,0.35) calc(100% - 48px), rgba(0,0,0,0.06) calc(100% - 18px), transparent 100%)',
                maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.06) 18px, rgba(0,0,0,0.35) 48px, rgb(0,0,0) 72px, rgb(0,0,0) calc(100% - 72px), rgba(0,0,0,0.35) calc(100% - 48px), rgba(0,0,0,0.06) calc(100% - 18px), transparent 100%)',
              }}
            />
            <div
              ref={scrollRef}
              className="editor-canvas scroll-smooth"
            >
              <motion.div
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
                {collaboration ? (
                  <YjsSyncPlugin
                    noteId={collaboration.noteId}
                    token={collaboration.token}
                    username={collaboration.username}
                    cursorColor={collaboration.cursorColor}
                    contentRef={contentRef}
                    onUsersChangeRef={onUsersChangeRef}
                    cursorsContainerRef={cursorsContainerRef}
                  />
                ) : (
                  <HistoryPlugin />
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
          </div>

          {toolbar && (
            <div className="relative z-20 min-h-0 shrink-0 bg-transparent">
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
