import { DependencyList, useEffect, useState } from 'react';
import { Db } from './build';
import { initDb } from './index';

/**
 * Run an async DB read and re-run when deps change (include the app store's
 * tick to refresh after writes). Returns undefined while loading.
 */
export function useDbQuery<T>(query: (db: Db) => Promise<T>, deps: DependencyList): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    // Route through initDb() (idempotent) rather than a synchronous getDb():
    // getDb() throws when the module singleton is momentarily unset (e.g. a
    // Fast Refresh re-evaluates db/index.ts while RootLayout stays mounted),
    // and that sync throw escaped this effect. initDb() awaits/rebuilds it.
    initDb()
      .then((db) => query(db))
      .then((result) => {
        if (alive) setData(result);
      })
      .catch((e: unknown) => {
        if (alive) console.error('db query failed', e);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return data;
}
