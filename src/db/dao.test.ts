import { createTestDb } from './testAdapter';
import { migrate } from './schema';
import {
  diaryDao,
  exercisesDao,
  foodsDao,
  recipesDao,
  settingsDao,
  workoutsDao,
} from './dao';
import { DbAdapter } from './adapter';
import { SetEntry } from '../lib/types';

function freshDb(): DbAdapter {
  const db = createTestDb();
  migrate(db);
  return db;
}

describe('migrate', () => {
  it('is idempotent', () => {
    const db = createTestDb();
    migrate(db);
    const v = db.userVersion();
    expect(v).toBeGreaterThan(0);
    migrate(db);
    expect(db.userVersion()).toBe(v);
  });
});

describe('foodsDao', () => {
  it('inserts and finds foods case-insensitively', () => {
    const db = freshDb();
    const foods = foodsDao(db);
    foods.insert({ name: 'Chicken breast', source: 'seed', per100: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 } });
    const hits = foods.search('chick');
    expect(hits).toHaveLength(1);
    expect(hits[0].name).toBe('Chicken breast');
    expect(hits[0].per100.kcal).toBe(165);
  });

  it('matches on brand too', () => {
    const db = freshDb();
    const foods = foodsDao(db);
    foods.insert({ name: 'Crunchy bar', brand: 'PikeFuel', source: 'custom', per100: { kcal: 450, protein: 20, carbs: 40, fat: 20 } });
    expect(foods.search('pikefuel')).toHaveLength(1);
  });

  it('ranks prefix matches before contains matches', () => {
    const db = freshDb();
    const foods = foodsDao(db);
    foods.insert({ name: 'Brown rice, cooked', source: 'seed', per100: { kcal: 112, protein: 2.3, carbs: 23.5, fat: 0.8 } });
    foods.insert({ name: 'Rice, white, cooked', source: 'seed', per100: { kcal: 130, protein: 2.7, carbs: 28.2, fat: 0.3 } });
    const hits = foods.search('rice');
    expect(hits[0].name).toBe('Rice, white, cooked');
  });

  it('hides soft-deleted foods from search but keeps getById', () => {
    const db = freshDb();
    const foods = foodsDao(db);
    const id = foods.insert({ name: 'Old food', source: 'custom', per100: { kcal: 100, protein: 1, carbs: 1, fat: 1 } });
    foods.softDelete(id);
    expect(foods.search('old')).toHaveLength(0);
    expect(foods.getById(id)?.name).toBe('Old food');
  });

  it('round-trips servings', () => {
    const db = freshDb();
    const foods = foodsDao(db);
    const id = foods.insert({ name: 'Bread', source: 'seed', per100: { kcal: 265, protein: 9, carbs: 49, fat: 3.2 } });
    foods.setServings(id, [{ label: '1 slice', grams: 28 }]);
    expect(foods.servingsFor(id)).toEqual([{ label: '1 slice', grams: 28 }]);
    foods.setServings(id, [{ label: '1 thick slice', grams: 40 }]);
    expect(foods.servingsFor(id)).toEqual([{ label: '1 thick slice', grams: 40 }]);
  });
});

describe('recipesDao', () => {
  it('creates recipes with ingredient joins', () => {
    const db = freshDb();
    const foods = foodsDao(db);
    const recipes = recipesDao(db);
    const chickenId = foods.insert({ name: 'Chicken', source: 'seed', per100: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 } });
    const riceId = foods.insert({ name: 'Rice', source: 'seed', per100: { kcal: 130, protein: 2.7, carbs: 28.2, fat: 0.3 } });

    const recipeId = recipes.insert({ name: 'Chicken & rice', servings: 2 });
    recipes.setItems(recipeId, [
      { foodId: chickenId, grams: 300 },
      { foodId: riceId, grams: 250 },
    ]);

    const items = recipes.itemsFor(recipeId);
    expect(items).toHaveLength(2);
    expect(items[0].foodName).toBe('Chicken');
    expect(items[0].per100.protein).toBe(31);
    expect(items[1].grams).toBe(250);

    expect(recipes.list().map((r) => r.name)).toEqual(['Chicken & rice']);
  });

  it('soft-deletes recipes out of the list', () => {
    const db = freshDb();
    const recipes = recipesDao(db);
    const id = recipes.insert({ name: 'Gone soon', servings: 1 });
    recipes.softDelete(id);
    expect(recipes.list()).toHaveLength(0);
    expect(recipes.getById(id)?.name).toBe('Gone soon');
  });
});

describe('diaryDao', () => {
  it('adds entries and reads them back per date in insertion order', () => {
    const db = freshDb();
    const foods = foodsDao(db);
    const diary = diaryDao(db);
    const foodId = foods.insert({ name: 'Oats', source: 'seed', per100: { kcal: 389, protein: 16.9, carbs: 66.3, fat: 6.9 } });

    diary.add({ date: '2026-07-15', meal: 'breakfast', foodId, grams: 50, qty: 50, unitLabel: 'g', kcal: 195, protein: 8.5, carbs: 33.2, fat: 3.5 });
    diary.add({ date: '2026-07-15', meal: 'lunch', foodId, grams: 100, qty: 100, unitLabel: 'g', kcal: 389, protein: 16.9, carbs: 66.3, fat: 6.9 });
    diary.add({ date: '2026-07-16', meal: 'breakfast', foodId, grams: 40, qty: 40, unitLabel: 'g', kcal: 156, protein: 6.8, carbs: 26.5, fat: 2.8 });

    const day = diary.forDate('2026-07-15');
    expect(day).toHaveLength(2);
    expect(day[0].meal).toBe('breakfast');
    expect(day[0].name).toBe('Oats');
    expect(day[1].kcal).toBe(389);
  });

  it('resolves recipe names and supports update/remove', () => {
    const db = freshDb();
    const recipes = recipesDao(db);
    const diary = diaryDao(db);
    const recipeId = recipes.insert({ name: 'Big stew', servings: 4 });

    const entryId = diary.add({ date: '2026-07-15', meal: 'dinner', recipeId, grams: 400, qty: 1, unitLabel: 'serving', kcal: 500, protein: 30, carbs: 40, fat: 20 });
    expect(diary.forDate('2026-07-15')[0].name).toBe('Big stew');

    diary.update(entryId, { grams: 800, qty: 2, unitLabel: 'serving', kcal: 1000, protein: 60, carbs: 80, fat: 40 });
    expect(diary.forDate('2026-07-15')[0].kcal).toBe(1000);

    diary.remove(entryId);
    expect(diary.forDate('2026-07-15')).toHaveLength(0);
  });
});

describe('exercisesDao', () => {
  it('inserts custom exercises with muscle arrays', () => {
    const db = freshDb();
    const exercises = exercisesDao(db);
    const id = exercises.insertCustom({
      name: 'Weighted dips',
      category: 'strength',
      primary: ['chest', 'triceps'],
      secondary: ['shoulders'],
    });
    const row = exercises.getById(id);
    expect(row?.primary).toEqual(['chest', 'triceps']);
    expect(row?.secondary).toEqual(['shoulders']);
    expect(row?.isCustom).toBe(true);
    expect(exercises.search('dips')).toHaveLength(1);
  });
});

describe('workoutsDao', () => {
  it('round-trips sets JSON and joins exercise metadata', () => {
    const db = freshDb();
    const exercises = exercisesDao(db);
    const workouts = workoutsDao(db);
    const exId = exercises.insertCustom({ name: 'Bench press', category: 'strength', primary: ['chest'], secondary: ['triceps', 'shoulders'] });

    const sets: SetEntry[] = [
      { reps: 8, weight: 60 },
      { reps: 8, weight: 62.5 },
    ];
    const id = workouts.add({ date: '2026-07-15', exerciseId: exId, sets });

    const day = workouts.forDate('2026-07-15');
    expect(day).toHaveLength(1);
    expect(day[0].name).toBe('Bench press');
    expect(day[0].primary).toEqual(['chest']);
    expect(day[0].sets).toEqual(sets);

    workouts.update(id, { sets: [{ reps: 5, weight: 70 }] });
    expect(workouts.forDate('2026-07-15')[0].sets).toEqual([{ reps: 5, weight: 70 }]);

    workouts.remove(id);
    expect(workouts.forDate('2026-07-15')).toHaveLength(0);
  });

  it('stores cardio entries', () => {
    const db = freshDb();
    const exercises = exercisesDao(db);
    const workouts = workoutsDao(db);
    const exId = exercises.insertCustom({ name: 'Treadmill run', category: 'cardio', primary: ['quads'], secondary: ['calves'] });
    workouts.add({ date: '2026-07-15', exerciseId: exId, sets: { durationMin: 30 } });
    expect(workouts.forDate('2026-07-15')[0].sets).toEqual({ durationMin: 30 });
  });
});

describe('settingsDao', () => {
  it('upserts and reads values with numeric fallback', () => {
    const db = freshDb();
    const settings = settingsDao(db);
    expect(settings.get('kcalGoal')).toBeUndefined();
    expect(settings.getNum('kcalGoal', 2200)).toBe(2200);
    settings.set('kcalGoal', '2500');
    settings.set('kcalGoal', '2600');
    expect(settings.get('kcalGoal')).toBe('2600');
    expect(settings.getNum('kcalGoal', 2200)).toBe(2600);
  });
});
