/**
 * Minimal SQLite surface the app depends on. Implemented by expo-sqlite on
 * device/web and better-sqlite3 in jest, so DAOs run real SQL in tests.
 * Fully async: expo-sqlite's web sync channel is unreliable (bounded
 * spin-wait), and async is the recommended API on every platform.
 */
export interface DbAdapter {
  run(sql: string, params?: unknown[]): Promise<{ lastInsertRowId: number }>;
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  first<T>(sql: string, params?: unknown[]): Promise<T | undefined>;
  userVersion(): Promise<number>;
  setUserVersion(v: number): Promise<void>;
}
