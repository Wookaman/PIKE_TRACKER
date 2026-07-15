import { buildDb } from '../db/build';
import { createTestDb } from '../db/testAdapter';
import { ALL_MUSCLES } from '../lib/types';
import { SEED_EXERCISES } from './exercises';
import { SEED_FOODS } from './foods';
import { seedIfEmpty } from './index';

describe('seed foods', () => {
  it('ships a real catalog', () => {
    expect(SEED_FOODS.length).toBeGreaterThanOrEqual(150);
  });

  it('has unique names', () => {
    const names = SEED_FOODS.map((f) => f.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('has plausible macros (Atwater within tolerance, nothing negative)', () => {
    for (const f of SEED_FOODS) {
      const { kcal, protein, carbs, fat } = f.per100;
      expect(kcal).toBeGreaterThanOrEqual(0);
      expect(protein).toBeGreaterThanOrEqual(0);
      expect(carbs).toBeGreaterThanOrEqual(0);
      expect(fat).toBeGreaterThanOrEqual(0);
      const atwater = 4 * protein + 4 * carbs + 9 * fat;
      const tolerance = Math.max(kcal * 0.25, 20);
      if (Math.abs(atwater - kcal) > tolerance) {
        throw new Error(`${f.name}: kcal ${kcal} vs macros ${atwater.toFixed(0)}`);
      }
    }
  });

  it('gives every food at least one serving beyond grams', () => {
    for (const f of SEED_FOODS) {
      expect(f.servings.length).toBeGreaterThanOrEqual(1);
      for (const s of f.servings) {
        expect(s.grams).toBeGreaterThan(0);
        expect(s.label).toBeTruthy();
      }
    }
  });
});

describe('seed exercises', () => {
  it('ships a real catalog', () => {
    expect(SEED_EXERCISES.length).toBeGreaterThanOrEqual(60);
  });

  it('has unique names', () => {
    const names = SEED_EXERCISES.map((e) => e.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('uses only canonical muscle ids and at least one primary muscle', () => {
    const valid = new Set<string>(ALL_MUSCLES);
    for (const e of SEED_EXERCISES) {
      expect(e.primary.length).toBeGreaterThanOrEqual(1);
      for (const m of [...e.primary, ...e.secondary]) {
        if (!valid.has(m)) throw new Error(`${e.name}: bad muscle id ${m}`);
      }
    }
  });

  it('covers every muscle with at least one exercise', () => {
    const covered = new Set(SEED_EXERCISES.flatMap((e) => [...e.primary, ...e.secondary]));
    for (const m of ALL_MUSCLES) {
      if (!covered.has(m)) throw new Error(`no exercise covers ${m}`);
    }
  });
});

describe('seedIfEmpty', () => {
  it('populates an empty database and is idempotent', async () => {
    const db = await buildDb(createTestDb());
    await seedIfEmpty(db);
    const foodCount = (await db.foods.search('', 10000)).length;
    const exerciseCount = (await db.exercises.list()).length;
    expect(foodCount).toBe(SEED_FOODS.length);
    expect(exerciseCount).toBe(SEED_EXERCISES.length);

    await seedIfEmpty(db);
    expect((await db.foods.search('', 10000)).length).toBe(foodCount);
    expect((await db.exercises.list()).length).toBe(exerciseCount);
  });

  it('attaches servings to seeded foods', async () => {
    const db = await buildDb(createTestDb());
    await seedIfEmpty(db);
    const [egg] = await db.foods.search('egg, whole');
    expect(egg).toBeTruthy();
    expect((await db.foods.servingsFor(egg.id)).length).toBeGreaterThanOrEqual(1);
  });
});
