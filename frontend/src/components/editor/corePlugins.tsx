import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateHtmlFromNodes } from '@lexical/html';
import { $isQuoteNode } from '@lexical/rich-text';
import { $isListNode, $isListItemNode, $createListNode } from '@lexical/list';
import { registerCodeHighlighting } from '@lexical/code';
import {
  $getRoot,
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
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  SKIP_COLLAB_TAG,
  LexicalNode,
} from 'lexical';

// ─── Links ───────────────────────────────────────────────────────────────────

export function LinkClickPlugin(): null {
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

// ─── Focus & change tracking ─────────────────────────────────────────────────

export function FocusAtEndPlugin(): null {
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

export function CodeHighlightPlugin(): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => registerCodeHighlighting(editor), [editor]);
  return null;
}

export function ChangePlugin({ onChange }: { onChange: (html: string) => void }) {
  const [editor] = useLexicalComposerContext();
  const readyRef = useRef(false);

  // setTimeout(0) fires after all rAF callbacks (including FocusAtEndPlugin's selectEnd
  // update) have settled, so we don't fire onChange for initialization-only updates.
  useEffect(() => {
    const id = setTimeout(() => { readyRef.current = true; }, 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    return editor.registerUpdateListener(({ dirtyElements, dirtyLeaves, tags }) => {
      if (!readyRef.current) return;
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
      if (tags.has('history-merge') || tags.has(SKIP_COLLAB_TAG) || tags.has('collaboration')) return;
      editor.read(() => {
        onChange($generateHtmlFromNodes(editor));
      });
    });
  }, [editor, onChange]);

  return null;
}

// ─── Quotes ──────────────────────────────────────────────────────────────────

// Plugin to enable multiline blockquotes
export function MultilineQuotePlugin(): null {
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

              currentNode.remove();

              const newParagraph = $createParagraphNode();
              quoteNode.insertAfter(newParagraph);
              newParagraph.select();

              return true;
            }
          }

          // Create new paragraph inside quote
          event?.preventDefault();
          const newParagraph = $createParagraphNode();

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

// ─── Line height ─────────────────────────────────────────────────────────────

// After each Lexical update, reads line-height from the first TextNode of every
// ElementNode and writes it directly to the DOM element's style. This is needed
// because Lexical's reconciler does NOT apply ElementNode.__style to the live DOM,
// and inline spans with a smaller line-height than the inherited block value are
// overridden by CSS cascade.
export function LineHeightSyncPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      const map = new Map<string, string>();

      editorState.read(() => {
        function walk(node: LexicalNode): void {
          if ($isRootNode(node)) {
            for (const child of node.getChildren()) walk(child);
            return;
          }
          if ($isElementNode(node)) {
            for (const child of node.getChildren()) {
              if ($isTextNode(child)) {
                const match = /line-height\s*:\s*([^;]+)/.exec(child.getStyle());
                map.set(node.getKey(), match ? match[1].trim() : '');
                break;
              }
            }
            for (const child of node.getChildren()) walk(child);
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

// ─── Indentation ─────────────────────────────────────────────────────────────

export function TabIndentPlugin(): null {
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
export function CheckListIndentPlugin(): null {
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
