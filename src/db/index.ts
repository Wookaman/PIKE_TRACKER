import { Platform } from 'react-native';
import { seedIfEmpty } from '../seed';
import { buildDb, Db } from './build';
import { createExpoDb } from './expoAdapter';
import { wipeWebDatabases } from './webOpfs';

export type { Db } from './build';
export { buildDb } from './build';

let instance: Db | undefined;
let pending: Promise<Db> | undefined;

/** One-time async init (root layout gates rendering on this). */
export function initDb(): Promise<Db> {
  if (instance) return Promise.resolve(instance);
  if (!pending) {
    // Web: the OPFS-backed driver allows one live instance per origin, and a
    // stale lock (second tab, crashed worker) would brick boot. The web
    // preview therefore uses a fresh session database per load.
    const name = Platform.OS === 'web' ? `pike-web-${Date.now()}.db` : 'pike.db';
    pending = wipeWebDatabases()
      .then(() => createExpoDb(name))
      .then(buildDb)
      .then(async (db) => {
        await seedIfEmpty(db);
        instance = db;
        return db;
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
