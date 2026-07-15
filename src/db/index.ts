import { seedIfEmpty } from '../seed';
import { buildDb, Db } from './build';
import { createExpoDb } from './expoAdapter';

export type { Db } from './build';
export { buildDb } from './build';

let instance: Db | undefined;

/** App-wide lazy singleton over the device database. Migrates and seeds. */
export function getDb(): Db {
  if (!instance) {
    instance = buildDb(createExpoDb());
    seedIfEmpty(instance);
  }
  return instance;
}
