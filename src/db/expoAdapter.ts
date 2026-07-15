import { openDatabaseSync, SQLiteDatabase } from 'expo-sqlite';
import { DbAdapter } from './adapter';

/** expo-sqlite (device + web) implementation of the adapter. */
export function createExpoDb(name = 'pike.db'): DbAdapter {
  const db: SQLiteDatabase = openDatabaseSync(name);
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
