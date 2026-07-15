import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import { DbAdapter } from './adapter';

/**
 * expo-sqlite (device + web) implementation of the adapter.
 * Opened async: on web the sync channel spin-waits with a short budget, so
 * the worker must be warm before any *Sync call — async open guarantees that.
 */
export async function createExpoDb(name = 'pike.db'): Promise<DbAdapter> {
  const db: SQLiteDatabase = await openDatabaseAsync(name);
  return {
    run(sql, params = []) {
      db.runSync(sql, params as never[]);
    },
    all<T>(sql: string, params: unknown[] = []) {
      return db.getAllSync<T>(sql, params as never[]);
    },
    first<T>(sql: string, params: unknown[] = []) {
      return db.getFirstSync<T>(sql, params as never[]) ?? undefined;
    },
    userVersion() {
      return db.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
    },
    setUserVersion(v) {
      db.execSync(`PRAGMA user_version = ${v}`);
    },
  };
}
