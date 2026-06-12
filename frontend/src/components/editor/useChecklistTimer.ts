import { useRef, useState, type MutableRefObject } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $createRangeSelection,
  $setSelection,
  $getNodeByKey,
  $isElementNode,
  LexicalNode,
} from 'lexical';
import { $createListItemNode, $createListNode, $isListItemNode } from '@lexical/list';
import { useCheckResetStore, ResetTimer } from '../../store/useCheckResetStore';
import {
  $isTimerListItemNode,
  $createTimerListItemNode,
  type TimerConfig,
} from './TimerListItemNode';

type SavedPoint = { key: string; offset: number; type: 'text' | 'element' };
export type SavedSelection = { anchor: SavedPoint; focus: SavedPoint } | null;

function generateResetId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Timer-checkbox feature: opening the config modal, converting list items to
// TimerListItemNodes and back, and syncing with the reset-timer store.
export function useChecklistTimer(
  saveSelection: () => void,
  savedSelectionRef: MutableRefObject<SavedSelection>,
) {
  const [editor] = useLexicalComposerContext();
  const { timers, setTimer, removeTimer } = useCheckResetStore();

  const checklistNodeKeyRef = useRef<string | null>(null);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [checklistCountdownHours, setChecklistCountdownHours] = useState(1);
  const [checklistCountdownMinutes, setChecklistCountdownMinutes] = useState(0);
  const [checklistExistingTimer, setChecklistExistingTimer] = useState<ResetTimer | undefined>(undefined);

  const openTimerModal = () => {
    saveSelection();
    let existingTimerConfig: TimerConfig | undefined;
    let existingTimer: ResetTimer | undefined;

    checklistNodeKeyRef.current = null;
    editor.read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      let node: LexicalNode | null = selection.anchor.getNode();
      while (node && !$isListItemNode(node)) node = node.getParent();
      if (!$isListItemNode(node)) return;
      checklistNodeKeyRef.current = node.getKey();
      if ($isTimerListItemNode(node)) {
        existingTimerConfig = node.getTimerConfig();
        existingTimer = timers[node.getResetId()] ?? { type: 'countdown', endsAt: 0, totalMs: existingTimerConfig.totalMs };
      }
    });

    if (existingTimerConfig) {
      setChecklistCountdownHours(Math.floor(existingTimerConfig.totalMs / 3_600_000));
      setChecklistCountdownMinutes(Math.floor((existingTimerConfig.totalMs % 3_600_000) / 60_000));
    } else {
      setChecklistCountdownHours(1);
      setChecklistCountdownMinutes(0);
    }
    setChecklistExistingTimer(existingTimer);
    setShowTimerModal(true);
  };

  const handleChecklistTimerSave = () => {
    const nodeKey = checklistNodeKeyRef.current;
    const totalMs = (checklistCountdownHours * 60 + checklistCountdownMinutes) * 60_000;
    if (totalMs <= 0) return;

    if (!nodeKey) {
      // No existing list item — create a new timer checkbox at the saved cursor position
      const timerConfig: TimerConfig = { type: 'countdown', totalMs };
      const newResetId = generateResetId();
      checklistNodeKeyRef.current = null;
      setShowTimerModal(false);

      editor.update(() => {
        const saved = savedSelectionRef.current;
        savedSelectionRef.current = null;
        if (saved) {
          const an = $getNodeByKey(saved.anchor.key);
          const fn = $getNodeByKey(saved.focus.key);
          if (an && fn) {
            const sel = $createRangeSelection();
            sel.anchor.set(saved.anchor.key, saved.anchor.offset, saved.anchor.type);
            sel.focus.set(saved.focus.key, saved.focus.offset, saved.focus.type);
            $setSelection(sel);
          }
        }

        const sel = $getSelection();
        if (!$isRangeSelection(sel)) return;

        const anchorNode = sel.anchor.getNode();

        // Check whether the cursor already sits inside a list item
        let listItem: LexicalNode | null = anchorNode;
        while (listItem && !$isListItemNode(listItem)) listItem = listItem.getParent();

        const timerNode = $createTimerListItemNode(timerConfig, newResetId);
        timerNode.setChecked(false);

        if (listItem && $isListItemNode(listItem) && !$isTimerListItemNode(listItem)) {
          for (const child of listItem.getChildren()) timerNode.append(child);
          listItem.replace(timerNode);
        } else {
          // Cursor in a paragraph or other block → embed in a check list
          const topEl = anchorNode.getKey() === 'root'
            ? anchorNode
            : (anchorNode.getTopLevelElementOrThrow() as LexicalNode);
          if ($isElementNode(topEl)) {
            for (const child of topEl.getChildren()) timerNode.append(child);
          }
          const listNode = $createListNode('check');
          listNode.append(timerNode);
          topEl.replace(listNode);
        }

        timerNode.selectEnd();
      });
      return;
    }

    const timerConfig: TimerConfig = { type: 'countdown', totalMs };

    // Read existing resetId and checked state before update (new nodes get a pre-generated one)
    let resetId = generateResetId();
    let nodeIsChecked = false;
    editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isTimerListItemNode(node)) {
        resetId = node.getResetId();
        nodeIsChecked = node.getChecked() ?? false;
      } else if ($isListItemNode(node)) {
        nodeIsChecked = node.getChecked() ?? false;
      }
    });
    const finalResetId = resetId;

    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (!node) return;
      if ($isTimerListItemNode(node)) {
        node.setTimerConfig(timerConfig);
      } else if ($isListItemNode(node)) {
        const timerNode = $createTimerListItemNode(timerConfig, finalResetId);
        timerNode.setChecked(node.getChecked() ?? false);
        for (const child of node.getChildren()) timerNode.append(child);
        node.replace(timerNode);
      }
    });

    if (nodeIsChecked) {
      setTimer(finalResetId, { type: 'countdown', endsAt: Date.now() + totalMs, totalMs });
    }
    // Unchecked: TimerCheckboxPlugin starts the timer on the first check

    checklistNodeKeyRef.current = null;
    setShowTimerModal(false);
  };

  const handleChecklistTimerRemove = () => {
    const nodeKey = checklistNodeKeyRef.current;
    if (!nodeKey) { setShowTimerModal(false); return; }

    let resetIdToRemove = '';
    editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isTimerListItemNode(node)) resetIdToRemove = node.getResetId();
    });

    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (!$isTimerListItemNode(node)) return;
      const regularNode = $createListItemNode();
      regularNode.setChecked(node.getChecked() ?? false);
      for (const child of node.getChildren()) regularNode.append(child);
      node.replace(regularNode);
    });

    if (resetIdToRemove) removeTimer(resetIdToRemove);
    checklistNodeKeyRef.current = null;
    setShowTimerModal(false);
  };

  return {
    showTimerModal, setShowTimerModal,
    checklistCountdownHours, setChecklistCountdownHours,
    checklistCountdownMinutes, setChecklistCountdownMinutes,
    checklistExistingTimer,
    openTimerModal,
    handleChecklistTimerSave,
    handleChecklistTimerRemove,
  };
}
