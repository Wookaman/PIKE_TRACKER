export type MuscleId =
  | 'shoulders'
  | 'chest'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'lats'
  | 'traps'
  | 'lower_back'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves';

export const ALL_MUSCLES: MuscleId[] = [
  'shoulders',
  'chest',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'obliques',
  'lats',
  'traps',
  'lower_back',
  'glutes',
  'quads',
  'hamstrings',
  'calves',
];

export const MUSCLE_LABELS: Record<MuscleId, string> = {
  shoulders: 'Shoulders',
  chest: 'Chest',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Abs',
  obliques: 'Obliques',
  lats: 'Lats',
  traps: 'Traps',
  lower_back: 'Lower back',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
};

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Per100 extends Macros {
  fiber?: number;
  sugar?: number;
  sodiumMg?: number;
}

export interface Serving {
  label: string;
  grams: number;
}

export type Unit = { kind: 'g' } | { kind: 'oz' } | { kind: 'serving'; serving: Serving };

/** One strength set. Weight unit is a display concern (settings). */
export interface SetEntry {
  reps: number;
  weight: number;
}

export interface CardioEntry {
  durationMin: number;
}

export type WorkoutSets = SetEntry[] | CardioEntry;
