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

// Dictation via the browser's Web Speech API (Chromium only). Provisional
// ("interim") text is written straight into the document and refined in place
// on every update, so the note fills live as the user speaks; each phrase is
// committed exactly once when the engine finalizes it. Writing interim text to
// the document (not just a preview) is what prevents loss: a mid-phrase engine
// restart bakes whatever was on screen instead of dropping it.
export function useDictation() {
  const [editor] = useLexicalComposerContext();
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Chromium ends a recognition session after silence or ~60s; while the user
  // hasn't pressed stop, onend restarts it to keep dictation running.
  const keepAliveRef = useRef(false);
  // A session that has NEVER heard speech is a broken input (wrong device,
  // muted mic), not a pause — tracked to stop the silent-restart loop.
  const heardSpeechRef = useRef(false);
  const noSpeechCyclesRef = useRef(0);
  // Edge/Chrome fire one-off 'network' errors during long sessions; only a
  // streak of them (no result in between) means the service is unreachable.
  const networkErrorsRef = useRef(0);
  // How many results of the CURRENT session are already committed as final
  // (so each finalized phrase is inserted once), and the char length of the
  // provisional interim tail currently sitting in the document.
  const committedCountRef = useRef(0);
  const interimLenRef = useRef(0);

  const isSupported = getRecognitionCtor() !== null;

  // Replace the provisional interim tail with the latest recognition state:
  // freshly finalized text is committed, the new interim tail is written live.
  const applyResult = useCallback(
    (finalStr: string, interimStr: string) => {
      if (!finalStr && !interimStr && interimLenRef.current === 0) return;
      editor.update(() => {
        let selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          $getRoot().selectEnd();
          selection = $getSelection();
        }
        if (!$isRangeSelection(selection)) return;

        // Remove the previous interim tail so it can be refined or replaced by
        // its finalized form. Deletion is backward from the caret we left there.
        for (let i = 0; i < interimLenRef.current; i++) selection.deleteCharacter(true);
        interimLenRef.current = 0;

        // Results carry no surrounding whitespace — pad with a leading space
        // unless the caret is at a block start or already after whitespace.
        const pad = (text: string): string => {
          const anchor = selection.anchor;
          if (anchor.type === 'text') {
            const node = anchor.getNode();
            if ($isTextNode(node) && anchor.offset > 0) {
              const prev = node.getTextContent()[anchor.offset - 1];
              if (prev && !/\s/.test(prev)) return ` ${text}`;
            }
          }
          return text;
        };

        if (finalStr) selection.insertText(pad(finalStr));
        if (interimStr) {
          const chunk = pad(interimStr);
          selection.insertText(chunk);
          interimLenRef.current = chunk.length;
        }
      });
    },
    [editor]
  );

  const stopDictation = useCallback(() => {
    keepAliveRef.current = false;
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  const startDictation = useCallback(() => {
    const Recognition = getRecognitionCtor();
    if (!Recognition || recognitionRef.current) return;
    setError('');
    heardSpeechRef.current = false;
    noSpeechCyclesRef.current = 0;
    networkErrorsRef.current = 0;
    committedCountRef.current = 0;
    interimLenRef.current = 0;
    const recognition = new Recognition();
    recognition.lang = navigator.language || 'de-DE';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (e) => {
      heardSpeechRef.current = true;
      networkErrorsRef.current = 0;
      let finalStr = '';
      let interimStr = '';
      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          if (i >= committedCountRef.current) {
            finalStr += result[0].transcript;
            committedCountRef.current = i + 1;
          }
        } else {
          interimStr += result[0].transcript;
        }
      }
      applyResult(finalStr.trim(), interimStr.trim());
    };
    recognition.onerror = (e) => {
      // 'aborted' is routine. 'no-speech' too — unless the session has never
      // heard anything: after ~3 silent cycles (≈25s) that's a dead input, and
      // pretending to listen forever hides it. 'network' gets a small retry
      // budget for transient blips. Everything else (not-allowed,
      // language-not-supported, …) is fatal immediately.
      if (e.error === 'aborted') return;
      if (e.error === 'no-speech') {
        if (heardSpeechRef.current || ++noSpeechCyclesRef.current < 3) return;
      }
      if (e.error === 'network' && ++networkErrorsRef.current < 3) return;
      console.warn('[dictation] recognition error:', e.error);
      keepAliveRef.current = false;
      setIsRecording(false);
      setError(
        e.error === 'no-speech'
          ? 'no speech detected — is the right microphone selected?'
          : e.error === 'network'
            ? 'speech service unreachable — ad blocker, firewall, or offline?'
            : e.error
      );
    };
    recognition.onend = () => {
      // A finished session's results list restarts at 0; bake the current
      // interim tail into the document (drop the ghost length so the next
      // session never deletes it) so nothing spoken is lost across restarts.
      committedCountRef.current = 0;
      interimLenRef.current = 0;
      if (keepAliveRef.current) recognition.start();
      else recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    keepAliveRef.current = true;
    recognition.start();
    setIsRecording(true);
  }, [applyResult]);

  const toggleDictation = useCallback(() => {
    if (isRecording) stopDictation();
    else startDictation();
  }, [isRecording, startDictation, stopDictation]);

  // Elapsed-time ticker, tied to the recording state so it starts and clears
  // itself without extra plumbing in start/stop/error.
  useEffect(() => {
    if (!isRecording) return;
    const started = Date.now();
    setElapsedSec(0);
    const id = window.setInterval(() => setElapsedSec(Math.floor((Date.now() - started) / 1000)), 500);
    return () => window.clearInterval(id);
  }, [isRecording]);

  // Never leave the microphone open after the editor unmounts.
  useEffect(
    () => () => {
      keepAliveRef.current = false;
      recognitionRef.current?.stop();
    },
    []
  );

  return { isSupported, isRecording, elapsedSec, error, toggleDictation };
}
