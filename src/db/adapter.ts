/**
 * Minimal SQLite surface the app depends on. Implemented by expo-sqlite on
 * device/web and better-sqlite3 in jest, so DAOs run real SQL in tests.
 */
export interface DbAdapter {
  run(sql: string, params?: unknown[]): void;
  all<T>(sql: string, params?: unknown[]): T[];
  first<T>(sql: string, params?: unknown[]): T | undefined;
  userVersion(): number;
  setUserVersion(v: number): void;
}
