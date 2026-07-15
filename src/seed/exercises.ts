import { MuscleId } from '../lib/types';

export interface SeedExercise {
  name: string;
  category: 'strength' | 'cardio';
  primary: MuscleId[];
  secondary: MuscleId[];
}

export const SEED_EXERCISES: SeedExercise[] = [
  // ---- Chest ----
  { name: 'Bench press', category: 'strength', primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  { name: 'Incline bench press', category: 'strength', primary: ['chest', 'shoulders'], secondary: ['triceps'] },
  { name: 'Dumbbell bench press', category: 'strength', primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  { name: 'Incline dumbbell press', category: 'strength', primary: ['chest', 'shoulders'], secondary: ['triceps'] },
  { name: 'Machine chest press', category: 'strength', primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  { name: 'Chest fly, dumbbell', category: 'strength', primary: ['chest'], secondary: ['shoulders'] },
  { name: 'Cable crossover', category: 'strength', primary: ['chest'], secondary: ['shoulders'] },
  { name: 'Push-up', category: 'strength', primary: ['chest'], secondary: ['triceps', 'shoulders', 'abs'] },
  { name: 'Dips', category: 'strength', primary: ['chest', 'triceps'], secondary: ['shoulders'] },

  // ---- Shoulders & traps ----
  { name: 'Overhead press, barbell', category: 'strength', primary: ['shoulders'], secondary: ['triceps', 'abs'] },
  { name: 'Dumbbell shoulder press', category: 'strength', primary: ['shoulders'], secondary: ['triceps'] },
  { name: 'Arnold press', category: 'strength', primary: ['shoulders'], secondary: ['triceps'] },
  { name: 'Lateral raise', category: 'strength', primary: ['shoulders'], secondary: [] },
  { name: 'Front raise', category: 'strength', primary: ['shoulders'], secondary: [] },
  { name: 'Rear delt fly', category: 'strength', primary: ['shoulders'], secondary: ['traps'] },
  { name: 'Face pull', category: 'strength', primary: ['shoulders', 'traps'], secondary: ['biceps'] },
  { name: 'Upright row', category: 'strength', primary: ['shoulders', 'traps'], secondary: ['biceps'] },
  { name: 'Barbell shrug', category: 'strength', primary: ['traps'], secondary: ['forearms'] },

  // ---- Back ----
  { name: 'Deadlift', category: 'strength', primary: ['lower_back', 'glutes', 'hamstrings'], secondary: ['traps', 'lats', 'forearms', 'quads'] },
  { name: 'Romanian deadlift', category: 'strength', primary: ['hamstrings', 'glutes'], secondary: ['lower_back', 'forearms'] },
  { name: 'Sumo deadlift', category: 'strength', primary: ['glutes', 'hamstrings', 'quads'], secondary: ['lower_back', 'traps'] },
  { name: 'Pull-up', category: 'strength', primary: ['lats'], secondary: ['biceps', 'forearms'] },
  { name: 'Chin-up', category: 'strength', primary: ['lats', 'biceps'], secondary: ['forearms'] },
  { name: 'Lat pulldown', category: 'strength', primary: ['lats'], secondary: ['biceps'] },
  { name: 'Barbell row', category: 'strength', primary: ['lats', 'traps'], secondary: ['biceps', 'lower_back'] },
  { name: 'Dumbbell row', category: 'strength', primary: ['lats'], secondary: ['biceps', 'traps'] },
  { name: 'Seated cable row', category: 'strength', primary: ['lats', 'traps'], secondary: ['biceps'] },
  { name: 'T-bar row', category: 'strength', primary: ['lats', 'traps'], secondary: ['biceps', 'lower_back'] },
  { name: 'Back extension', category: 'strength', primary: ['lower_back'], secondary: ['glutes', 'hamstrings'] },
  { name: 'Good morning', category: 'strength', primary: ['hamstrings', 'lower_back'], secondary: ['glutes'] },

  // ---- Biceps ----
  { name: 'Barbell curl', category: 'strength', primary: ['biceps'], secondary: ['forearms'] },
  { name: 'Dumbbell curl', category: 'strength', primary: ['biceps'], secondary: ['forearms'] },
  { name: 'Hammer curl', category: 'strength', primary: ['biceps', 'forearms'], secondary: [] },
  { name: 'Preacher curl', category: 'strength', primary: ['biceps'], secondary: [] },
  { name: 'Cable curl', category: 'strength', primary: ['biceps'], secondary: ['forearms'] },

  // ---- Triceps ----
  { name: 'Triceps pushdown', category: 'strength', primary: ['triceps'], secondary: [] },
  { name: 'Overhead triceps extension', category: 'strength', primary: ['triceps'], secondary: [] },
  { name: 'Skullcrusher', category: 'strength', primary: ['triceps'], secondary: [] },
  { name: 'Close-grip bench press', category: 'strength', primary: ['triceps', 'chest'], secondary: ['shoulders'] },
  { name: 'Triceps kickback', category: 'strength', primary: ['triceps'], secondary: [] },

  // ---- Forearms & grip ----
  { name: 'Wrist curl', category: 'strength', primary: ['forearms'], secondary: [] },
  { name: "Farmer's carry", category: 'strength', primary: ['forearms', 'traps'], secondary: ['abs', 'shoulders'] },

  // ---- Legs ----
  { name: 'Squat, barbell', category: 'strength', primary: ['quads', 'glutes'], secondary: ['hamstrings', 'lower_back', 'abs'] },
  { name: 'Front squat', category: 'strength', primary: ['quads'], secondary: ['glutes', 'abs'] },
  { name: 'Goblet squat', category: 'strength', primary: ['quads', 'glutes'], secondary: ['abs'] },
  { name: 'Leg press', category: 'strength', primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  { name: 'Hack squat', category: 'strength', primary: ['quads'], secondary: ['glutes'] },
  { name: 'Bulgarian split squat', category: 'strength', primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  { name: 'Lunge, dumbbell', category: 'strength', primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  { name: 'Step-up', category: 'strength', primary: ['quads', 'glutes'], secondary: ['calves'] },
  { name: 'Leg extension', category: 'strength', primary: ['quads'], secondary: [] },
  { name: 'Leg curl', category: 'strength', primary: ['hamstrings'], secondary: [] },
  { name: 'Hip thrust', category: 'strength', primary: ['glutes'], secondary: ['hamstrings'] },
  { name: 'Cable glute kickback', category: 'strength', primary: ['glutes'], secondary: ['hamstrings'] },
  { name: 'Hip abduction machine', category: 'strength', primary: ['glutes'], secondary: [] },
  { name: 'Standing calf raise', category: 'strength', primary: ['calves'], secondary: [] },
  { name: 'Seated calf raise', category: 'strength', primary: ['calves'], secondary: [] },
  { name: 'Kettlebell swing', category: 'strength', primary: ['glutes', 'hamstrings'], secondary: ['lower_back', 'shoulders', 'abs'] },

  // ---- Core ----
  { name: 'Crunch', category: 'strength', primary: ['abs'], secondary: [] },
  { name: 'Sit-up', category: 'strength', primary: ['abs'], secondary: ['obliques'] },
  { name: 'Plank', category: 'strength', primary: ['abs'], secondary: ['obliques', 'lower_back', 'shoulders'] },
  { name: 'Side plank', category: 'strength', primary: ['obliques'], secondary: ['abs', 'shoulders'] },
  { name: 'Russian twist', category: 'strength', primary: ['obliques'], secondary: ['abs'] },
  { name: 'Hanging leg raise', category: 'strength', primary: ['abs'], secondary: ['obliques', 'forearms'] },
  { name: 'Cable crunch', category: 'strength', primary: ['abs'], secondary: ['obliques'] },
  { name: 'Ab wheel rollout', category: 'strength', primary: ['abs'], secondary: ['lats', 'lower_back'] },
  { name: 'Bicycle crunch', category: 'strength', primary: ['abs', 'obliques'], secondary: [] },
  { name: 'Mountain climbers', category: 'strength', primary: ['abs'], secondary: ['quads', 'shoulders'] },
  { name: 'Burpee', category: 'strength', primary: ['quads', 'chest'], secondary: ['abs', 'shoulders', 'calves'] },

  // ---- Cardio ----
  { name: 'Running', category: 'cardio', primary: ['quads'], secondary: ['hamstrings', 'calves', 'glutes'] },
  { name: 'Walking', category: 'cardio', primary: ['quads'], secondary: ['calves', 'glutes'] },
  { name: 'Cycling', category: 'cardio', primary: ['quads'], secondary: ['hamstrings', 'calves', 'glutes'] },
  { name: 'Rowing machine', category: 'cardio', primary: ['lats', 'quads'], secondary: ['biceps', 'lower_back', 'traps'] },
  { name: 'Swimming', category: 'cardio', primary: ['lats', 'shoulders'], secondary: ['triceps', 'abs'] },
  { name: 'Jump rope', category: 'cardio', primary: ['calves'], secondary: ['quads', 'shoulders', 'forearms'] },
  { name: 'Elliptical', category: 'cardio', primary: ['quads'], secondary: ['glutes', 'hamstrings', 'calves'] },
  { name: 'Stair climber', category: 'cardio', primary: ['quads', 'glutes'], secondary: ['calves'] },
  { name: 'Hiking', category: 'cardio', primary: ['quads', 'glutes'], secondary: ['calves', 'hamstrings'] },
];
