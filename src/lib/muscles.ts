import { MuscleId } from './types';

export type MuscleHighlights = Partial<Record<MuscleId, 'primary' | 'secondary'>>;

/** Union of muscles across a day's workouts; primary always outranks secondary. */
export function aggregateMuscles(
  workouts: { primary: MuscleId[]; secondary: MuscleId[] }[],
): MuscleHighlights {
  const out: MuscleHighlights = {};
  for (const w of workouts) {
    for (const m of w.secondary) {
      if (out[m] !== 'primary') out[m] = 'secondary';
    }
    for (const m of w.primary) {
      out[m] = 'primary';
    }
  }
  return out;
}
