import { getDb } from '../db';
import {
  Activity,
  ACTIVITY_LABELS,
  clampRate,
  computeGoals,
  Goals,
  parseRate,
  Sex,
  tdee,
  WeeklyRate,
} from '../lib/goals';

export interface ProfileStats {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  activity?: Activity;
  complete: boolean;
}

/** Read the stored profile. `complete` is false until onboarding has run. */
export async function loadProfile(): Promise<ProfileStats> {
  const s = getDb().settings;
  const weightKg = Number(await s.get('profileWeightKg'));
  const heightCm = Number(await s.get('profileHeightCm'));
  const age = Number(await s.get('profileAge'));
  const sex: Sex = (await s.get('profileSex')) === 'female' ? 'female' : 'male';
  const activityRaw = (await s.get('profileActivity')) ?? '';
  const activity = activityRaw in ACTIVITY_LABELS ? (activityRaw as Activity) : undefined;
  return {
    weightKg,
    heightCm,
    age,
    sex,
    activity,
    complete: [weightKg, heightCm, age].every((n) => Number.isFinite(n) && n > 0),
  };
}

export async function loadRate(): Promise<WeeklyRate> {
  return parseRate(await getDb().settings.get('weightGoalRate'));
}

/**
 * Recompute and persist the calorie/macro targets from the stored profile and
 * rate, with optional overrides. Overwrites any manual edits and marks the
 * targets as computed. Returns undefined when the profile is incomplete.
 */
export async function recomputeAndSaveGoals(
  override: { rate?: WeeklyRate; weightKg?: number; persistWeight?: boolean } = {},
): Promise<Goals | undefined> {
  const s = getDb().settings;
  const profile = await loadProfile();
  const weightKg = override.weightKg ?? profile.weightKg;
  const requested = override.rate ?? (await loadRate());

  if (!Number.isFinite(weightKg) || weightKg <= 0 || !profile.complete) return undefined;

  const input = {
    weightKg,
    heightCm: profile.heightCm,
    age: profile.age,
    sex: profile.sex,
    activity: profile.activity,
  };
  // A stored rate can become unsafe when the profile changes, so re-check it
  // here rather than trusting the last selection.
  const rate = clampRate(tdee(input), requested, profile.sex);
  const goals = computeGoals({ ...input, rate });

  await s.set('weightGoalRate', String(rate));
  if (override.persistWeight) await s.set('profileWeightKg', String(Math.round(weightKg * 10) / 10));
  await s.set('kcalGoal', String(goals.kcal));
  await s.set('proteinGoal', String(goals.protein));
  await s.set('carbsGoal', String(goals.carbs));
  await s.set('fatGoal', String(goals.fat));
  await s.set('goalSource', 'computed');
  return goals;
}
