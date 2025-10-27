import { ReactNode, useState, useRef } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { HeadingNode, QuoteNode, $isQuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
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
} from 'lexical';
import { useEffect } from 'react';

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

// Plugin to load initial content on mount
function InitialContentPlugin({ content }: { content: string }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.update(() => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(content || '<p></p>', 'text/html');
      const nodes = $generateNodesFromDOM(editor, dom);

      const root = $getRoot();
      root.clear();
      $insertNodes(nodes);
    });
  }, [editor]); // Only run on mount, not when content changes

  return null;
}

// Plugin to handle content changes from user typing
function ChangePlugin({ onChange }: { onChange: (html: string) => void }) {
  const [editor] = useLexicalComposerContext();

  const handleChange = () => {
    editor.read(() => {
      const htmlString = $generateHtmlFromNodes(editor);
      onChange(htmlString);
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

const LexicalEditorWrapper = ({
  content,
  onChange,
  placeholder = "Beginne zu schreiben...",
  disabled = false,
  toolbar,
}: LexicalEditorWrapperProps) => {
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
    ],
  };

  return (
    <>
      <style>{`
        .editor-container {
          position: relative;
          background: transparent;
          color: var(--color-text-primary);
          font-size: 16px;
          line-height: 1.6;
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
          color: var(--color-text-primary);
        }

        .editor-placeholder {
          color: var(--color-text-muted);
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
          margin-bottom: 8px;
          position: relative;
        }

        .editor-paragraph:last-child {
          margin-bottom: 0;
        }

        .editor-quote {
          margin: 16px 0;
          padding: 12px 16px;
          border-left: 4px solid var(--color-accent-500);
          background-color: color-mix(in srgb, var(--color-accent-500) 5%, transparent);
          border-radius: 4px;
          color: var(--color-text-secondary);
          font-style: italic;
        }

        .editor-heading-h1 {
          font-size: 2em;
          font-weight: 700;
          margin: 0.67em 0;
          color: var(--color-text-primary);
        }

        .editor-heading-h2 {
          font-size: 1.5em;
          font-weight: 700;
          margin: 0.75em 0;
          color: var(--color-text-primary);
        }

        .editor-heading-h3 {
          font-size: 1.25em;
          font-weight: 700;
          margin: 0.83em 0;
          color: var(--color-text-primary);
        }

        .editor-list-ol {
          list-style-type: decimal;
          margin-left: 20px;
          margin-top: 10px;
          margin-bottom: 10px;
          padding: 0;
        }

        .editor-list-ul {
          list-style-type: disc;
          margin-left: 20px;
          margin-top: 10px;
          margin-bottom: 10px;
          padding: 0;
        }

        .editor-listitem {
          margin-bottom: 5px;
          color: var(--color-text-primary);
        }

        .editor-listitem::marker {
          color: var(--color-text-muted);
        }

        .editor-nested-listitem {
          list-style-type: none;
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

      <LexicalComposer initialConfig={initialConfig}>
        <InitialContentPlugin content={content} />
        <ChangePlugin onChange={onChange} />
        <MultilineQuotePlugin />

        {/* Toolbar */}
        {toolbar}

        {/* Editor */}
        <div className="flex-1 overflow-y-auto px-12 pt-8 pb-8">
          <div className="editor-container">
            <RichTextPlugin
              contentEditable={<ContentEditable className="editor-input" />}
              placeholder={<div className="editor-placeholder">{placeholder}</div>}
              ErrorBoundary={LexicalErrorBoundary}
            />
            <HistoryPlugin />
            <AutoFocusPlugin />
            <ListPlugin />
            <LinkPlugin />
            <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          </div>
        </div>
      </LexicalComposer>
    </>
  );
};

export default LexicalEditorWrapper;
