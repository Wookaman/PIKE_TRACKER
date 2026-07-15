import Database from 'better-sqlite3';
import { DbAdapter } from './adapter';

/** In-memory SQLite for jest. Never imported by app code. */
export function createTestDb(): DbAdapter {
  const db = new Database(':memory:');
  return {
    async run(sql, params = []) {
      const info = db.prepare(sql).run(...(params as never[]));
      return { lastInsertRowId: Number(info.lastInsertRowid) };
    },
    async all<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).all(...(params as never[])) as T[];
    },
    async first<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).get(...(params as never[])) as T | undefined;
    },
    async userVersion() {
      return (db.pragma('user_version', { simple: true }) as number) ?? 0;
    },
    async setUserVersion(v) {
      db.pragma(`user_version = ${v}`);
    },
  };
}
