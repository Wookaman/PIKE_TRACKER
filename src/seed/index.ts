import { Db } from '../db/build';
import { SEED_EXERCISES } from './exercises';
import { SEED_FOODS } from './foods';

/** First-launch seeding. Safe to call every startup. */
export function seedIfEmpty(db: Db): void {
  const hasSeedFood = db.adapter.first<{ id: number }>(
    `SELECT id FROM foods WHERE source = 'seed' LIMIT 1`,
  );
  if (!hasSeedFood) {
    for (const f of SEED_FOODS) {
      const id = db.foods.insert({ name: f.name, brand: f.brand, source: 'seed', per100: f.per100 });
      db.foods.setServings(id, f.servings);
    }
  }

  const hasSeedExercise = db.adapter.first<{ id: number }>(
    `SELECT id FROM exercises WHERE is_custom = 0 LIMIT 1`,
  );
  if (!hasSeedExercise) {
    for (const e of SEED_EXERCISES) {
      db.exercises.insertSeed(e);
    }
  }
}
