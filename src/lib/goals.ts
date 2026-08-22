import { KG_PER_LB, kgToLb } from './units';

export type Sex = 'male' | 'female';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

/** Weekly weight-change target in lb/week. Negative = loss, 0 = maintain. */
export type WeeklyRate = -1 | -0.75 | -0.5 | -0.25 | 0 | 0.25 | 0.5 | 0.75 | 1;

export const RATE_OPTIONS: WeeklyRate[] = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1];

/** Roughly one pound of body mass. Standard planning approximation. */
export const KCAL_PER_LB = 3500;

/** Lowest calorie target we will hand a user. Rates below this are disabled. */
export const CALORIE_FLOOR: Record<Sex, number> = { female: 1200, male: 1500 };

const PROTEIN_G_PER_LB = 1.0;
const PROTEIN_KCAL_SHARE_CAP = 0.4;

export interface GoalInput {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  activity?: Activity;
}

export interface Goals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

const ACTIVITY_FACTOR: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<Activity, string> = {
  sedentary: 'Sedentary',
  light: 'Lightly active',
  moderate: 'Moderately active',
  active: 'Active',
  very_active: 'Very active',
};

/** Mifflin-St Jeor basal metabolic rate (calories/day at rest). */
export function bmrMifflin(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
}

/** Maintenance calories: BMR x activity factor. Unrounded. */
export function tdee(input: GoalInput): number {
  return bmrMifflin(input.weightKg, input.heightCm, input.age, input.sex) *
    ACTIVITY_FACTOR[input.activity ?? 'sedentary'];
}

/** Maintenance shifted by the weekly rate: 1 lb/week = 500 kcal/day. */
export function targetKcal(tdeeValue: number, rate: WeeklyRate): number {
  return Math.round(tdeeValue + (rate * KCAL_PER_LB) / 7);
}

/**
 * Whether a rate is safe to offer. Only deficits are gated — maintaining or
 * gaining never drops you below the floor, so those stay selectable even for
 * a very low TDEE.
 */
export function isRateAllowed(tdeeValue: number, rate: WeeklyRate, sex: Sex): boolean {
  if (rate >= 0) return true;
  return targetKcal(tdeeValue, rate) >= CALORIE_FLOOR[sex];
}

/**
 * Daily calorie + macro targets. Protein is anchored to bodyweight (1 g/lb)
 * so it holds up in a deficit, capped at 40% of calories; the remaining
 * calories split 4:3 between carbs and fat.
 */
export function computeGoals(input: GoalInput & { rate?: WeeklyRate }): Goals {
  const kcal = targetKcal(tdee(input), input.rate ?? 0);
  const proteinCapG = (kcal * PROTEIN_KCAL_SHARE_CAP) / 4;
  const protein = Math.min(kgToLb(input.weightKg) * PROTEIN_G_PER_LB, proteinCapG);
  const remainder = kcal - protein * 4;
  return {
    kcal,
    protein: Math.round(protein),
    carbs: Math.round((remainder * (4 / 7)) / 4),
    fat: Math.round((remainder * (3 / 7)) / 9),
  };
}

/** Button label for a rate, in the user's display unit. */
export function rateLabel(rate: WeeklyRate, unit: string): string {
  if (rate === 0) return 'MAINTAIN';
  const magnitude =
    unit === 'lb' ? Math.abs(rate) : Math.round(Math.abs(rate) * KG_PER_LB * 100) / 100;
  return `${rate < 0 ? 'LOSE' : 'GAIN'} ${magnitude} ${unit.toUpperCase()}/WK`;
}

/** Read a stored rate string; anything unrecognised falls back to maintain. */
export function parseRate(value: string | undefined): WeeklyRate {
  const n = Number(value);
  return (RATE_OPTIONS as number[]).includes(n) ? (n as WeeklyRate) : 0;
}

/**
 * Keep a rate inside the safe floor. If the chosen deficit no longer clears
 * the floor (e.g. the profile changed), step toward maintenance until it does.
 * Prevents a stale selection from silently producing a sub-floor target.
 */
export function clampRate(tdeeValue: number, rate: WeeklyRate, sex: Sex): WeeklyRate {
  if (isRateAllowed(tdeeValue, rate, sex)) return rate;
  const gentler = RATE_OPTIONS.filter((r) => r > rate).sort((a, b) => a - b);
  for (const candidate of gentler) {
    if (isRateAllowed(tdeeValue, candidate, sex)) return candidate;
  }
  return 0;
}
