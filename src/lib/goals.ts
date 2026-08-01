export type Sex = 'male' | 'female';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

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

/** Mifflin–St Jeor basal metabolic rate (calories/day at rest). */
export function bmrMifflin(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
}

/**
 * Daily calorie + macro targets. BMR × activity factor (missing activity =
 * sedentary), then a 30% protein / 40% carbs / 30% fat split into grams.
 */
export function computeGoals(input: GoalInput): Goals {
  const bmr = bmrMifflin(input.weightKg, input.heightCm, input.age, input.sex);
  const kcal = Math.round(bmr * ACTIVITY_FACTOR[input.activity ?? 'sedentary']);
  return {
    kcal,
    protein: Math.round((kcal * 0.3) / 4),
    carbs: Math.round((kcal * 0.4) / 4),
    fat: Math.round((kcal * 0.3) / 9),
  };
}
