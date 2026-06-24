import { useEffect, useRef, useLayoutEffect } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import {
  createBinding,
  syncLexicalUpdateToYjs,
  syncYjsChangesToLexical,
  initLocalState,
  setLocalStateFocus,
} from '@lexical/yjs';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateNodesFromDOM } from '@lexical/html';
import {
  $getRoot,
  $insertNodes,
  COMMAND_PRIORITY_EDITOR,
  FOCUS_COMMAND,
  BLUR_COMMAND,
  SKIP_COLLAB_TAG,
  CLEAR_HISTORY_COMMAND,
} from 'lexical';

export interface ActiveUser {
  clientID: number;
  userId: string;
  name: string;
  color: string;
  canEdit: boolean;
}

interface YjsSyncPluginProps {
  noteId: string;
  token: string;
  userId: string;
  username: string;
  cursorColor: string;
  canEdit: boolean;
  contentRef: React.MutableRefObject<string>;
  onUsersChangeRef: React.MutableRefObject<((users: ActiveUser[]) => void) | undefined>;
  cursorsContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function YjsSyncPlugin({
  noteId,
  token,
  userId,
  username,
  cursorColor,
  canEdit,
  contentRef,
  onUsersChangeRef,
  cursorsContainerRef,
}: YjsSyncPluginProps) {
  const [editor] = useLexicalComposerContext();
  const usernameRef = useRef(username);
  const cursorColorRef = useRef(cursorColor);
  const tokenRef = useRef(token);
  const canEditRef = useRef(canEdit);
  const userIdRef = useRef(userId);
  useLayoutEffect(() => {
    usernameRef.current = username;
    cursorColorRef.current = cursorColor;
    tokenRef.current = token;
    canEditRef.current = canEdit;
    userIdRef.current = userId;
  });

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const wsBase = apiUrl.replace(/^http/, 'ws');
    const doc = new Y.Doc();
    const docMap = new Map<string, Y.Doc>([[noteId, doc]]);

    const provider = new WebsocketProvider(
      `${wsBase}/collaboration`,
      noteId,
      doc,
      { params: { token: tokenRef.current }, connect: false },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;

    const binding = createBinding(editor, provider, noteId, doc, docMap);

    if (cursorsContainerRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (binding as any).cursorsContainer = cursorsContainerRef.current;
    }

    initLocalState(
      provider,
      usernameRef.current,
      cursorColorRef.current,
      document.activeElement === editor.getRootElement(),
      { canEdit: canEditRef.current, userId: userIdRef.current },
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
    let didInitialSync = false;
    let firstSync = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // Only the first sync may seed/reinsert content. A reconnect resync would
      // otherwise clear+reinsert and reset the caret to the document end.
      if (didInitialSync) return;
      didInitialSync = true;
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
      // Clear history so the initial load isn't an undo-able entry
      setTimeout(() => editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined), 0);
    };
    provider.on('sync', onSync);

    const onAwarenessChange = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const states = Array.from(provider.awareness.getStates().entries()) as [number, any][];
      const others = states
        .filter(([cid]) => cid !== provider.awareness.clientID)
        .filter(([, state]) => state?.name != null)
        .map(([cid, state]) => ({
          clientID: cid,
          userId: state.awarenessData?.userId ?? '',
          name: state.name,
          color: state.color ?? '#888',
          // Older/owner states may omit awarenessData; treat as editor.
          canEdit: state.awarenessData?.canEdit ?? true,
        }));
      onUsersChangeRef.current?.(others);
    };
    provider.awareness.on('update', onAwarenessChange);

    provider.connect();

    return () => {
      removeFocusCmd();
      removeBlurCmd();
      unregisterUpdate();
      binding.root.getSharedType().unobserveDeep(onYjsTreeChanges);
      provider.off('sync', onSync);
      provider.awareness.off('update', onAwarenessChange);
      provider.disconnect();
      provider.destroy();
    };
  }, [editor, noteId]); // stable deps — no reconnect cycle

  return null;
}
