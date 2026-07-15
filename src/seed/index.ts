import { Db } from '../db/build';
import { SEED_EXERCISES } from './exercises';
import { SEED_FOODS } from './foods';

/** First-launch seeding. Safe to call every startup. */
export async function seedIfEmpty(db: Db): Promise<void> {
  const hasSeedFood = await db.adapter.first<{ id: number }>(
    `SELECT id FROM foods WHERE source = 'seed' LIMIT 1`,
  );
  if (!hasSeedFood) {
    for (const f of SEED_FOODS) {
      const id = await db.foods.insert({ name: f.name, brand: f.brand, source: 'seed', per100: f.per100 });
      await db.foods.setServings(id, f.servings);
    }
  }

  const hasSeedExercise = await db.adapter.first<{ id: number }>(
    `SELECT id FROM exercises WHERE is_custom = 0 LIMIT 1`,
  );
  if (!hasSeedExercise) {
    for (const e of SEED_EXERCISES) {
      await db.exercises.insertSeed(e);
    }
  }
}
