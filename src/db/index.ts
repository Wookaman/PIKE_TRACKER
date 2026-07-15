import { DbAdapter } from './adapter';
import {
  diaryDao,
  exercisesDao,
  foodsDao,
  recipesDao,
  settingsDao,
  workoutsDao,
} from './dao';
import { createExpoDb } from './expoAdapter';
import { migrate } from './schema';

export interface Db {
  adapter: DbAdapter;
  foods: ReturnType<typeof foodsDao>;
  recipes: ReturnType<typeof recipesDao>;
  diary: ReturnType<typeof diaryDao>;
  exercises: ReturnType<typeof exercisesDao>;
  workouts: ReturnType<typeof workoutsDao>;
  settings: ReturnType<typeof settingsDao>;
}

export function buildDb(adapter: DbAdapter): Db {
  migrate(adapter);
  return {
    adapter,
    foods: foodsDao(adapter),
    recipes: recipesDao(adapter),
    diary: diaryDao(adapter),
    exercises: exercisesDao(adapter),
    workouts: workoutsDao(adapter),
    settings: settingsDao(adapter),
  };
}

let instance: Db | undefined;

/** App-wide lazy singleton over the device database. */
export function getDb(): Db {
  if (!instance) {
    instance = buildDb(createExpoDb());
  }
  return instance;
}
