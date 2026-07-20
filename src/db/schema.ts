import { DbAdapter } from './adapter';

/**
 * Append-only migration list. Each entry is one schema version; migrate()
 * applies everything past PRAGMA user_version.
 */
const MIGRATIONS: string[][] = [
  [
    `CREATE TABLE foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      brand TEXT,
      source TEXT NOT NULL DEFAULT 'custom',
      kcal_100g REAL NOT NULL,
      protein_100g REAL NOT NULL,
      carbs_100g REAL NOT NULL,
      fat_100g REAL NOT NULL,
      fiber_100g REAL,
      sugar_100g REAL,
      sodium_mg_100g REAL,
      barcode TEXT,
      deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX idx_foods_name ON foods(name)`,
    `CREATE TABLE food_servings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      food_id INTEGER NOT NULL REFERENCES foods(id),
      label TEXT NOT NULL,
      grams REAL NOT NULL
    )`,
    `CREATE TABLE recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      servings REAL NOT NULL DEFAULT 1,
      notes TEXT,
      deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE recipe_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL REFERENCES recipes(id),
      food_id INTEGER NOT NULL REFERENCES foods(id),
      grams REAL NOT NULL
    )`,
    `CREATE TABLE diary_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      meal TEXT NOT NULL,
      food_id INTEGER REFERENCES foods(id),
      recipe_id INTEGER REFERENCES recipes(id),
      grams REAL NOT NULL,
      qty REAL NOT NULL,
      unit_label TEXT NOT NULL,
      kcal REAL NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fat REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX idx_diary_date ON diary_entries(date)`,
    `CREATE TABLE exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'strength',
      primary_muscles TEXT NOT NULL DEFAULT '[]',
      secondary_muscles TEXT NOT NULL DEFAULT '[]',
      is_custom INTEGER NOT NULL DEFAULT 0,
      deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE workout_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      exercise_id INTEGER NOT NULL REFERENCES exercises(id),
      sets TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX idx_workout_date ON workout_entries(date)`,
    `CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
  ],
  [
    // Unilateral: the logged weight is per-limb, so total volume counts both
    // sides (doubles). Stored per workout entry, alongside the sets JSON.
    `ALTER TABLE workout_entries ADD COLUMN unilateral INTEGER NOT NULL DEFAULT 0`,
  ],
];

export async function migrate(db: DbAdapter): Promise<void> {
  const current = await db.userVersion();
  for (let v = current; v < MIGRATIONS.length; v++) {
    for (const sql of MIGRATIONS[v]) {
      await db.run(sql);
    }
  }
  await db.setUserVersion(MIGRATIONS.length);
}
