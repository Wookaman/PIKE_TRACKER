import Database from 'better-sqlite3';
import { DbAdapter } from './adapter';

/** In-memory SQLite for jest. Never imported by app code. */
export function createTestDb(): DbAdapter {
  const db = new Database(':memory:');
  return {
    run(sql, params = []) {
      db.prepare(sql).run(...(params as never[]));
    },
    all<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).all(...(params as never[])) as T[];
    },
    first<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).get(...(params as never[])) as T | undefined;
    },
    userVersion() {
      return (db.pragma('user_version', { simple: true }) as number) ?? 0;
    },
    setUserVersion(v) {
      db.pragma(`user_version = ${v}`);
    },
  };
}
