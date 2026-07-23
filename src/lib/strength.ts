import { SetEntry } from './types';

/**
 * Estimated one-rep max (Epley formula). Rep-normalized single-number strength
 * metric — comparable across sessions regardless of the rep scheme, which raw
 * weight or average weight are not.
 */
export function epley1RM(reps: number, weight: number): number {
  return weight * (1 + reps / 30);
}

/** Best (highest) estimated 1RM across a session's sets. 0 when empty. */
export function sessionE1RM(sets: SetEntry[]): number {
  return sets.reduce((best, s) => Math.max(best, epley1RM(s.reps, s.weight)), 0);
}
