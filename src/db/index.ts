import { seedIfEmpty } from '../seed';
import { buildDb, Db } from './build';
import { createExpoDb } from './expoAdapter';

export type { Db } from './build';
export { buildDb } from './build';

let instance: Db | undefined;
let pending: Promise<Db> | undefined;

/** One-time async init (root layout gates rendering on this). */
export function initDb(): Promise<Db> {
  if (instance) return Promise.resolve(instance);
  if (!pending) {
    pending = createExpoDb().then((adapter) => {
      instance = buildDb(adapter);
      seedIfEmpty(instance);
      return instance;
    });
  }
  return pending;
}

/** Synchronous access for screens. Safe only after initDb() resolved. */
export function getDb(): Db {
  if (!instance) {
    throw new Error('Database not ready — initDb() must resolve before screens render');
  }
  return instance;
}
