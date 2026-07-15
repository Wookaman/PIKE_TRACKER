import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import { DbAdapter } from './adapter';

/** expo-sqlite (device + web) implementation of the adapter. Async-only. */
export async function createExpoDb(name = 'pike.db'): Promise<DbAdapter> {
  const db: SQLiteDatabase = await openDatabaseAsync(name);
  return {
    async run(sql, params = []) {
      const result = await db.runAsync(sql, params as never[]);
      return { lastInsertRowId: result.lastInsertRowId };
    },
    async all<T>(sql: string, params: unknown[] = []) {
      return db.getAllAsync<T>(sql, params as never[]);
    },
    async first<T>(sql: string, params: unknown[] = []) {
      return (await db.getFirstAsync<T>(sql, params as never[])) ?? undefined;
    },
    async userVersion() {
      const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      return row?.user_version ?? 0;
    },
    async setUserVersion(v) {
      await db.execAsync(`PRAGMA user_version = ${v}`);
    },
  };
}
