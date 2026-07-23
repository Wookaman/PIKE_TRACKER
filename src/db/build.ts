import { DbAdapter } from './adapter';
import {
  bodyweightDao,
  diaryDao,
  exercisesDao,
  foodsDao,
  recipesDao,
  settingsDao,
  workoutsDao,
} from './dao';
import { migrate } from './schema';

export interface Db {
  adapter: DbAdapter;
  foods: ReturnType<typeof foodsDao>;
  recipes: ReturnType<typeof recipesDao>;
  diary: ReturnType<typeof diaryDao>;
  exercises: ReturnType<typeof exercisesDao>;
  workouts: ReturnType<typeof workoutsDao>;
  settings: ReturnType<typeof settingsDao>;
  bodyweight: ReturnType<typeof bodyweightDao>;
}

/** Migrate + wire DAOs over any adapter. Pure of native imports. */
export async function buildDb(adapter: DbAdapter): Promise<Db> {
  await migrate(adapter);
  return {
    adapter,
    foods: foodsDao(adapter),
    recipes: recipesDao(adapter),
    diary: diaryDao(adapter),
    exercises: exercisesDao(adapter),
    workouts: workoutsDao(adapter),
    settings: settingsDao(adapter),
    bodyweight: bodyweightDao(adapter),
  };
}
