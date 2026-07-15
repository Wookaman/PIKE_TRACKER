import { create } from 'zustand';
import { todayKey } from '../lib/dates';

interface AppState {
  /** Selected diary day, shared by Diary and Workouts tabs. */
  dateKey: string;
  /** Data refresh counter — bump after any DB write. */
  tick: number;
  setDateKey(dateKey: string): void;
  bump(): void;
}

export const useAppStore = create<AppState>((set) => ({
  dateKey: todayKey(),
  tick: 0,
  setDateKey: (dateKey) => set({ dateKey }),
  bump: () => set((s) => ({ tick: s.tick + 1 })),
}));
