import { DependencyList, useEffect, useState } from 'react';
import { Db } from './build';
import { getDb } from './index';

/**
 * Run an async DB read and re-run when deps change (include the app store's
 * tick to refresh after writes). Returns undefined while loading.
 */
export function useDbQuery<T>(query: (db: Db) => Promise<T>, deps: DependencyList): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    query(getDb())
      .then((result) => {
        if (alive) setData(result);
      })
      .catch((e: unknown) => console.error('db query failed', e));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return data;
}
