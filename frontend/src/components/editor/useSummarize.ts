import { useState, useRef, useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $createParagraphNode } from 'lexical';
import { $convertFromMarkdownString, TRANSFORMERS } from '@lexical/markdown';
import { aiService, type SummarizeUsage } from '../../services/ai.service';
import { getApiErrorMessage } from '../../lib/apiError';

export type SummarizeStatus = 'idle' | 'loading' | 'done' | 'error';

// Sends the note's plain text to the backend AI route and applies the returned
// Markdown to the document (replace or append) after user confirmation.
// `enabled` (plan grants access) gates the usage fetch — free users never call it.
export function useSummarize(enabled: boolean) {
  const [editor] = useLexicalComposerContext();
  const [status, setStatus] = useState<SummarizeStatus>('idle');
  const [markdown, setMarkdown] = useState('');
  const [error, setError] = useState('');
  const [usage, setUsage] = useState<SummarizeUsage | null>(null);
  // Closing the modal mid-request must not let the late response reopen it.
  const requestIdRef = useRef(0);

  // Load the current month's remaining quota once the plan allows summarizing.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    aiService
      .getUsage()
      .then((u) => { if (!cancelled) setUsage(u); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [enabled]);

  const startSummarize = async () => {
    const text = editor
      .getEditorState()
      .read(() => $getRoot().getTextContent())
      .trim();
    if (!text || status === 'loading') return;
    const requestId = ++requestIdRef.current;
    setStatus('loading');
    setMarkdown('');
    setError('');
    try {
      const { markdown: md, usage: newUsage } = await aiService.summarize(text);
      if (requestIdRef.current !== requestId) return;
      setMarkdown(md);
      if (newUsage) setUsage(newUsage);
      setStatus('done');
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setError(getApiErrorMessage(err, 'Failed to summarize the note'));
      setStatus('error');
    }
  };

  const closeSummary = () => {
    requestIdRef.current++;
    setStatus('idle');
  };

  const applyReplace = () => {
    editor.update(() => {
      $convertFromMarkdownString(markdown, TRANSFORMERS);
    });
    closeSummary();
  };

  const applyInsertBelow = () => {
    editor.update(() => {
      // $convertFromMarkdownString fills one element node. Parse into a
      // temporary container, then hoist its children to the top level —
      // block nodes (headings, lists) may not stay inside a paragraph.
      const root = $getRoot();
      const container = $createParagraphNode();
      root.append(container);
      $convertFromMarkdownString(markdown, TRANSFORMERS, container);
      for (const child of container.getChildren()) {
        container.insertBefore(child);
      }
      container.remove();
    });
    closeSummary();
  };

  return { status, markdown, error, usage, startSummarize, closeSummary, applyReplace, applyInsertBelow };
}
