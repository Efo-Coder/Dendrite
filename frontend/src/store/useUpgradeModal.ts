import { create } from 'zustand';

// Global trigger for the upgrade/plans modal so plan-gated controls anywhere
// (editor toolbar, version history, export menu, color favorites) can open it
// without prop-drilling. The modal itself is mounted once in DashboardPage.
interface UpgradeModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useUpgradeModal = create<UpgradeModalState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
