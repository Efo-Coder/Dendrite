import { createContext, useContext } from 'react';
import type { useToolbarState } from './useToolbarState';

type ToolbarState = ReturnType<typeof useToolbarState>;

export const ToolbarStateContext = createContext<ToolbarState | null>(null);

export const useToolbarStateContext = (): ToolbarState => {
  const ctx = useContext(ToolbarStateContext);
  if (!ctx) throw new Error('ElevatedToolbar must be rendered inside RichTextToolbar');
  return ctx;
};
