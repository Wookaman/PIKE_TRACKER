import { createTestDb } from './testAdapter';
import { migrate } from './schema';
import {
  bodyweightDao,
  diaryDao,
  exercisesDao,
  foodsDao,
  recipesDao,
  settingsDao,
  workoutsDao,
} from './dao';
import { DbAdapter } from './adapter';
import { SetEntry } from '../lib/types';

async function freshDb(): Promise<DbAdapter> {
  const db = createTestDb();
  await migrate(db);
  return db;
}

describe('migrate', () => {
  it('is idempotent', async () => {
    const db = createTestDb();
    await migrate(db);
    const v = await db.userVersion();
    expect(v).toBeGreaterThan(0);
    await migrate(db);
    expect(await db.userVersion()).toBe(v);
  });

  it('creates the bodyweight table (v2)', async () => {
    const db = await freshDb();
    // Would throw "no such table" if the v2 migration did not run.
    await db.run(`INSERT INTO bodyweight_entries (date, weight) VALUES ('2026-07-19', 80)`);
    const row = await db.first<{ weight: number }>(`SELECT weight FROM bodyweight_entries LIMIT 1`);
    expect(row?.weight).toBe(80);
  });
});

describe('bodyweightDao', () => {
  it('upserts one entry per day (overwrite) and reads latest + history', async () => {
    const bw = bodyweightDao(await freshDb());
    expect(await bw.latest()).toBeUndefined();

    await bw.set('2026-07-17', 80);
    await bw.set('2026-07-18', 79.5);
    await bw.set('2026-07-18', 79.2); // same day -> overwrite

    expect(await bw.latest()).toEqual({ date: '2026-07-18', weight: 79.2 });
    expect(await bw.history()).toEqual([
      { date: '2026-07-17', weight: 80 },
      { date: '2026-07-18', weight: 79.2 },
    ]);
  });
});

describe('foodsDao', () => {
  it('inserts and finds foods case-insensitively', async () => {
    const foods = foodsDao(await freshDb());
    await foods.insert({ name: 'Chicken breast', source: 'seed', per100: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 } });
    const hits = await foods.search('chick');
    expect(hits).toHaveLength(1);
    expect(hits[0].name).toBe('Chicken breast');
    expect(hits[0].per100.kcal).toBe(165);
  });

  it('matches on brand too', async () => {
    const foods = foodsDao(await freshDb());
    await foods.insert({ name: 'Crunchy bar', brand: 'PikeFuel', source: 'custom', per100: { kcal: 450, protein: 20, carbs: 40, fat: 20 } });
    expect(await foods.search('pikefuel')).toHaveLength(1);
  });

  it('ranks prefix matches before contains matches', async () => {
    const foods = foodsDao(await freshDb());
    await foods.insert({ name: 'Brown rice, cooked', source: 'seed', per100: { kcal: 112, protein: 2.3, carbs: 23.5, fat: 0.8 } });
    await foods.insert({ name: 'Rice, white, cooked', source: 'seed', per100: { kcal: 130, protein: 2.7, carbs: 28.2, fat: 0.3 } });
    const hits = await foods.search('rice');
    expect(hits[0].name).toBe('Rice, white, cooked');
  });

  it('hides soft-deleted foods from search but keeps getById', async () => {
    const foods = foodsDao(await freshDb());
    const id = await foods.insert({ name: 'Old food', source: 'custom', per100: { kcal: 100, protein: 1, carbs: 1, fat: 1 } });
    await foods.softDelete(id);
    expect(await foods.search('old')).toHaveLength(0);
    expect((await foods.getById(id))?.name).toBe('Old food');
  });

  it('round-trips servings', async () => {
    const foods = foodsDao(await freshDb());
    const id = await foods.insert({ name: 'Bread', source: 'seed', per100: { kcal: 265, protein: 9, carbs: 49, fat: 3.2 } });
    await foods.setServings(id, [{ label: '1 slice', grams: 28 }]);
    expect(await foods.servingsFor(id)).toEqual([{ label: '1 slice', grams: 28 }]);
    await foods.setServings(id, [{ label: '1 thick slice', grams: 40 }]);
    expect(await foods.servingsFor(id)).toEqual([{ label: '1 thick slice', grams: 40 }]);
  });
});

describe('recipesDao', () => {
  it('creates recipes with ingredient joins', async () => {
    const db = await freshDb();
    const foods = foodsDao(db);
    const recipes = recipesDao(db);
    const chickenId = await foods.insert({ name: 'Chicken', source: 'seed', per100: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 } });
    const riceId = await foods.insert({ name: 'Rice', source: 'seed', per100: { kcal: 130, protein: 2.7, carbs: 28.2, fat: 0.3 } });

    const recipeId = await recipes.insert({ name: 'Chicken & rice', servings: 2 });
    await recipes.setItems(recipeId, [
      { foodId: chickenId, grams: 300 },
      { foodId: riceId, grams: 250 },
    ]);

    const items = await recipes.itemsFor(recipeId);
    expect(items).toHaveLength(2);
    expect(items[0].foodName).toBe('Chicken');
    expect(items[0].per100.protein).toBe(31);
    expect(items[1].grams).toBe(250);

    expect((await recipes.list()).map((r) => r.name)).toEqual(['Chicken & rice']);
  });

  it('soft-deletes recipes out of the list', async () => {
    const recipes = recipesDao(await freshDb());
    const id = await recipes.insert({ name: 'Gone soon', servings: 1 });
    await recipes.softDelete(id);
    expect(await recipes.list()).toHaveLength(0);
    expect((await recipes.getById(id))?.name).toBe('Gone soon');
  });
});

describe('diaryDao', () => {
  it('adds entries and reads them back per date in insertion order', async () => {
    const db = await freshDb();
    const foods = foodsDao(db);
    const diary = diaryDao(db);
    const foodId = await foods.insert({ name: 'Oats', source: 'seed', per100: { kcal: 389, protein: 16.9, carbs: 66.3, fat: 6.9 } });

    await diary.add({ date: '2026-07-15', meal: 'breakfast', foodId, grams: 50, qty: 50, unitLabel: 'g', kcal: 195, protein: 8.5, carbs: 33.2, fat: 3.5 });
    await diary.add({ date: '2026-07-15', meal: 'lunch', foodId, grams: 100, qty: 100, unitLabel: 'g', kcal: 389, protein: 16.9, carbs: 66.3, fat: 6.9 });
    await diary.add({ date: '2026-07-16', meal: 'breakfast', foodId, grams: 40, qty: 40, unitLabel: 'g', kcal: 156, protein: 6.8, carbs: 26.5, fat: 2.8 });

    const day = await diary.forDate('2026-07-15');
    expect(day).toHaveLength(2);
    expect(day[0].meal).toBe('breakfast');
    expect(day[0].name).toBe('Oats');
    expect(day[1].kcal).toBe(389);
  });

  it('resolves recipe names and supports update/remove', async () => {
    const db = await freshDb();
    const recipes = recipesDao(db);
    const diary = diaryDao(db);
    const recipeId = await recipes.insert({ name: 'Big stew', servings: 4 });

    const entryId = await diary.add({ date: '2026-07-15', meal: 'dinner', recipeId, grams: 400, qty: 1, unitLabel: 'serving', kcal: 500, protein: 30, carbs: 40, fat: 20 });
    expect((await diary.forDate('2026-07-15'))[0].name).toBe('Big stew');

    await diary.update(entryId, { grams: 800, qty: 2, unitLabel: 'serving', kcal: 1000, protein: 60, carbs: 80, fat: 40 });
    expect((await diary.forDate('2026-07-15'))[0].kcal).toBe(1000);

    await diary.remove(entryId);
    expect(await diary.forDate('2026-07-15')).toHaveLength(0);
  });
});

describe('exercisesDao', () => {
  it('inserts custom exercises with muscle arrays', async () => {
    const exercises = exercisesDao(await freshDb());
    const id = await exercises.insertCustom({
      name: 'Weighted dips',
      category: 'strength',
      primary: ['chest', 'triceps'],
      secondary: ['shoulders'],
    });
    const row = await exercises.getById(id);
    expect(row?.primary).toEqual(['chest', 'triceps']);
    expect(row?.secondary).toEqual(['shoulders']);
    expect(row?.isCustom).toBe(true);
    expect(await exercises.search('dips')).toHaveLength(1);
  });
});

describe('workoutsDao', () => {
  it('round-trips sets JSON and joins exercise metadata', async () => {
    const db = await freshDb();
    const exercises = exercisesDao(db);
    const workouts = workoutsDao(db);
    const exId = await exercises.insertCustom({ name: 'Bench press', category: 'strength', primary: ['chest'], secondary: ['triceps', 'shoulders'] });

    const sets: SetEntry[] = [
      { reps: 8, weight: 60 },
      { reps: 8, weight: 62.5 },
    ];
    const id = await workouts.add({ date: '2026-07-15', exerciseId: exId, sets });

    const day = await workouts.forDate('2026-07-15');
    expect(day).toHaveLength(1);
    expect(day[0].name).toBe('Bench press');
    expect(day[0].primary).toEqual(['chest']);
    expect(day[0].sets).toEqual(sets);
    expect(day[0].unilateral).toBe(false);

    await workouts.update(id, { sets: [{ reps: 5, weight: 70 }] });
    expect((await workouts.forDate('2026-07-15'))[0].sets).toEqual([{ reps: 5, weight: 70 }]);

    await workouts.remove(id);
    expect(await workouts.forDate('2026-07-15')).toHaveLength(0);
  });

  it('round-trips the unilateral flag', async () => {
    const db = await freshDb();
    const exercises = exercisesDao(db);
    const workouts = workoutsDao(db);
    const exId = await exercises.insertCustom({ name: 'Lateral raise', category: 'strength', primary: ['shoulders'], secondary: [] });

    const id = await workouts.add({
      date: '2026-07-15',
      exerciseId: exId,
      sets: [{ reps: 12, weight: 20 }],
      unilateral: true,
    });
    expect((await workouts.forDate('2026-07-15'))[0].unilateral).toBe(true);

    await workouts.update(id, { sets: [{ reps: 12, weight: 20 }], unilateral: false });
    expect((await workouts.forDate('2026-07-15'))[0].unilateral).toBe(false);
  });

  it('stores cardio entries', async () => {
    const db = await freshDb();
    const exercises = exercisesDao(db);
    const workouts = workoutsDao(db);
    const exId = await exercises.insertCustom({ name: 'Treadmill run', category: 'cardio', primary: ['quads'], secondary: ['calves'] });
    await workouts.add({ date: '2026-07-15', exerciseId: exId, sets: { durationMin: 30 } });
    expect((await workouts.forDate('2026-07-15'))[0].sets).toEqual({ durationMin: 30 });
  });

  it('lastBefore returns the most recent prior entry, or undefined', async () => {
    const db = await freshDb();
    const exercises = exercisesDao(db);
    const workouts = workoutsDao(db);
    const exId = await exercises.insertCustom({ name: 'Squat', category: 'strength', primary: ['quads'], secondary: [] });

    expect(await workouts.lastBefore(exId, '2026-07-15')).toBeUndefined();

    await workouts.add({ date: '2026-07-10', exerciseId: exId, sets: [{ reps: 5, weight: 100 }] });
    await workouts.add({ date: '2026-07-13', exerciseId: exId, sets: [{ reps: 5, weight: 105 }] });

    const prev = await workouts.lastBefore(exId, '2026-07-15');
    expect(prev?.date).toBe('2026-07-13');
    expect(prev?.sets).toEqual([{ reps: 5, weight: 105 }]);

    // a workout on the given day is not "before" it
    expect((await workouts.lastBefore(exId, '2026-07-13'))?.date).toBe('2026-07-10');
  });

  it('historyForExercise returns all sessions ordered by date', async () => {
    const db = await freshDb();
    const exercises = exercisesDao(db);
    const workouts = workoutsDao(db);
    const exId = await exercises.insertCustom({ name: 'Deadlift', category: 'strength', primary: ['hamstrings'], secondary: [] });

    await workouts.add({ date: '2026-07-13', exerciseId: exId, sets: [{ reps: 5, weight: 140 }] });
    await workouts.add({ date: '2026-07-10', exerciseId: exId, sets: [{ reps: 5, weight: 130 }] });

    const hist = await workouts.historyForExercise(exId);
    expect(hist.map((h) => h.date)).toEqual(['2026-07-10', '2026-07-13']);
    expect(hist[1].sets).toEqual([{ reps: 5, weight: 140 }]);
  });

  it('loggedExercises returns distinct logged strength exercises', async () => {
    const db = await freshDb();
    const exercises = exercisesDao(db);
    const workouts = workoutsDao(db);
    const benchId = await exercises.insertCustom({ name: 'Bench', category: 'strength', primary: ['chest'], secondary: [] });
    const runId = await exercises.insertCustom({ name: 'Run', category: 'cardio', primary: ['quads'], secondary: [] });
    await exercises.insertCustom({ name: 'Never logged', category: 'strength', primary: ['abs'], secondary: [] });

    await workouts.add({ date: '2026-07-10', exerciseId: benchId, sets: [{ reps: 8, weight: 60 }] });
    await workouts.add({ date: '2026-07-13', exerciseId: benchId, sets: [{ reps: 8, weight: 62.5 }] });
    await workouts.add({ date: '2026-07-11', exerciseId: runId, sets: { durationMin: 20 } });

    const logged = await workouts.loggedExercises();
    // bench appears once (distinct), cardio excluded, never-logged excluded
    expect(logged).toEqual([{ id: benchId, name: 'Bench' }]);
  });
});

describe('settingsDao', () => {
  it('upserts and reads values with numeric fallback', async () => {
    const settings = settingsDao(await freshDb());
    expect(await settings.get('kcalGoal')).toBeUndefined();
    expect(await settings.getNum('kcalGoal', 2200)).toBe(2200);
    await settings.set('kcalGoal', '2500');
    await settings.set('kcalGoal', '2600');
    expect(await settings.get('kcalGoal')).toBe('2600');
    expect(await settings.getNum('kcalGoal', 2200)).toBe(2600);
  });
});
