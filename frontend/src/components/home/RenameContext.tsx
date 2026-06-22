import { createContext, useCallback, useContext, useRef, useState } from 'react';

type CommitFn = (value: string) => void;

interface RenameContextValue {
  // The card id currently being renamed inline, or null.
  editingId: string | null;
  // Start an inline rename of a card; the menu hook supplies how to persist it.
  begin: (id: string, commit: CommitFn) => void;
  // Called by the card on Enter / blur with the new value.
  commit: (value: string) => void;
  // Called by the card on Escape.
  cancel: () => void;
}

const RenameContext = createContext<RenameContextValue | null>(null);

// Shared inline-rename state so any card can be put into edit mode from its context
// menu without drilling editing props through every grid, section and view.
export const RenameProvider = ({ children }: { children: React.ReactNode }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  // The commit is owned by the menu hook (it knows the entity type/store), so the
  // card stays generic and just hands back the typed value.
  const commitRef = useRef<CommitFn | null>(null);

  const begin = useCallback((id: string, commit: CommitFn) => {
    commitRef.current = commit;
    setEditingId(id);
  }, []);

  const commit = useCallback((value: string) => {
    commitRef.current?.(value);
    commitRef.current = null;
    setEditingId(null);
  }, []);

  const cancel = useCallback(() => {
    commitRef.current = null;
    setEditingId(null);
  }, []);

  return (
    <RenameContext.Provider value={{ editingId, begin, commit, cancel }}>
      {children}
    </RenameContext.Provider>
  );
};

export function useRename(): RenameContextValue {
  const ctx = useContext(RenameContext);
  if (!ctx) throw new Error('useRename must be used within a RenameProvider');
  return ctx;
}
