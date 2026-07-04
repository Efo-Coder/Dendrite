import { useState, useRef, useCallback, useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $getSelection, $isRangeSelection, $isTextNode } from 'lexical';

// ─── Web Speech API types (missing from the TS DOM lib) ───

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResult };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognition;

const getRecognitionCtor = (): SpeechRecognitionCtor | null => {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

// ─── Hook ───

// Dictation via the browser's Web Speech API (Chromium only). Interim results
// are exposed as live preview text; only finalized phrases are written into the
// document, so collaborators and the undo history never see provisional text.
export function useDictation() {
  const [editor] = useLexicalComposerContext();
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Chromium ends a recognition session after silence or ~60s; while the user
  // hasn't pressed stop, onend restarts it to keep dictation running.
  const keepAliveRef = useRef(false);

  const isSupported = getRecognitionCtor() !== null;

  const insertFinalText = useCallback(
    (raw: string) => {
      const phrase = raw.trim();
      if (!phrase) return;
      editor.update(() => {
        let selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          $getRoot().selectEnd();
          selection = $getSelection();
        }
        if (!$isRangeSelection(selection)) return;
        // Recognition results carry no surrounding whitespace — pad manually
        // unless the caret already sits after whitespace or at a block start.
        let chunk = phrase;
        const anchor = selection.anchor;
        if (anchor.type === 'text') {
          const node = anchor.getNode();
          if ($isTextNode(node) && anchor.offset > 0) {
            const prev = node.getTextContent()[anchor.offset - 1];
            if (prev && !/\s/.test(prev)) chunk = ` ${phrase}`;
          }
        }
        selection.insertText(chunk);
      });
    },
    [editor]
  );

  const stopDictation = useCallback(() => {
    keepAliveRef.current = false;
    recognitionRef.current?.stop();
    setIsRecording(false);
    setInterimText('');
  }, []);

  const startDictation = useCallback(() => {
    const Recognition = getRecognitionCtor();
    if (!Recognition || recognitionRef.current) return;
    const recognition = new Recognition();
    recognition.lang = navigator.language || 'de-DE';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) insertFinalText(result[0].transcript);
        else interim += result[0].transcript;
      }
      setInterimText(interim.trim());
    };
    recognition.onerror = (e) => {
      // 'no-speech'/'aborted' are routine and handled by the onend keep-alive;
      // permission errors end the session for good.
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        keepAliveRef.current = false;
        setIsRecording(false);
        setInterimText('');
      }
    };
    recognition.onend = () => {
      if (keepAliveRef.current) {
        recognition.start();
      } else {
        recognitionRef.current = null;
      }
    };
    recognitionRef.current = recognition;
    keepAliveRef.current = true;
    recognition.start();
    setIsRecording(true);
  }, [insertFinalText]);

  const toggleDictation = useCallback(() => {
    if (isRecording) stopDictation();
    else startDictation();
  }, [isRecording, startDictation, stopDictation]);

  // Never leave the microphone open after the editor unmounts.
  useEffect(
    () => () => {
      keepAliveRef.current = false;
      recognitionRef.current?.stop();
    },
    []
  );

  return { isSupported, isRecording, interimText, toggleDictation };
}
