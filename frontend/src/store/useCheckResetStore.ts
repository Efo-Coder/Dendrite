import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ResetTimer = { type: 'countdown'; endsAt: number; totalMs: number };

interface CheckResetState {
  timers: Record<string, ResetTimer>;
  setTimer: (resetId: string, timer: ResetTimer) => void;
  removeTimer: (resetId: string) => void;
}

export const useCheckResetStore = create<CheckResetState>()(
  persist(
    (set) => ({
      timers: {},
      setTimer: (resetId, timer) =>
        set(state => ({ timers: { ...state.timers, [resetId]: timer } })),
      removeTimer: (resetId) =>
        set(state => {
          const { [resetId]: _removed, ...rest } = state.timers;
          return { timers: rest };
        }),
    }),
    { name: 'dendrite-check-reset' }
  )
);
