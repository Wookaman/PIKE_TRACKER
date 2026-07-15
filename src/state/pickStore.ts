import { create } from 'zustand';

/**
 * Cross-modal food picking: recipe editor registers a callback, food search
 * (in pick mode) delivers the chosen food id back to it.
 */
interface PickState {
  onPick?: (foodId: number) => void;
  setOnPick(cb: ((foodId: number) => void) | undefined): void;
}

export const usePickStore = create<PickState>((set) => ({
  onPick: undefined,
  setOnPick: (onPick) => set({ onPick }),
}));
