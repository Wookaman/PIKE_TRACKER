import { MuscleId, Per100, Serving, WorkoutSets } from '../lib/types';
import { DbAdapter } from './adapter';

export type FoodSource = 'seed' | 'custom' | 'off';
export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snacks';
export type ExerciseCategory = 'strength' | 'cardio';

export interface FoodRow {
  id: number;
  name: string;
  brand?: string;
  source: FoodSource;
  barcode?: string;
  per100: Per100;
}

export interface FoodInput {
  name: string;
  brand?: string;
  source: FoodSource;
  barcode?: string;
  per100: Per100;
}

export interface RecipeRow {
  id: number;
  name: string;
  servings: number;
  notes?: string;
}

export interface RecipeItemRow {
  id: number;
  foodId: number;
  grams: number;
  foodName: string;
  per100: Per100;
}

export interface DiaryEntryRow {
  id: number;
  date: string;
  meal: Meal;
  foodId?: number;
  recipeId?: number;
  grams: number;
  qty: number;
  unitLabel: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  name: string;
}

export interface NewDiaryEntry {
  date: string;
  meal: Meal;
  foodId?: number;
  recipeId?: number;
  grams: number;
  qty: number;
  unitLabel: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ExerciseRow {
  id: number;
  name: string;
  category: ExerciseCategory;
  primary: MuscleId[];
  secondary: MuscleId[];
  isCustom: boolean;
}

export interface WorkoutEntryRow {
  id: number;
  date: string;
  exerciseId: number;
  name: string;
  category: ExerciseCategory;
  primary: MuscleId[];
  secondary: MuscleId[];
  sets: WorkoutSets;
  notes?: string;
  /** Per-limb logging: total volume counts both sides. */
  unilateral: boolean;
}

interface RawFood {
  id: number;
  name: string;
  brand: string | null;
  source: FoodSource;
  barcode: string | null;
  kcal_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  fiber_100g: number | null;
  sugar_100g: number | null;
  sodium_mg_100g: number | null;
}

const FOOD_COLS =
  'id, name, brand, source, barcode, kcal_100g, protein_100g, carbs_100g, fat_100g, fiber_100g, sugar_100g, sodium_mg_100g';

function toFoodRow(r: RawFood): FoodRow {
  return {
    id: r.id,
    name: r.name,
    brand: r.brand ?? undefined,
    source: r.source,
    barcode: r.barcode ?? undefined,
    per100: {
      kcal: r.kcal_100g,
      protein: r.protein_100g,
      carbs: r.carbs_100g,
      fat: r.fat_100g,
      fiber: r.fiber_100g ?? undefined,
      sugar: r.sugar_100g ?? undefined,
      sodiumMg: r.sodium_mg_100g ?? undefined,
    },
  };
}

export function foodsDao(db: DbAdapter) {
  return {
    async search(q: string, limit = 50): Promise<FoodRow[]> {
      const needle = `%${q.toLowerCase()}%`;
      const prefix = `${q.toLowerCase()}%`;
      const rows = await db.all<RawFood>(
        `SELECT ${FOOD_COLS} FROM foods
         WHERE deleted = 0 AND (LOWER(name) LIKE ? OR LOWER(COALESCE(brand,'')) LIKE ?)
         ORDER BY (LOWER(name) LIKE ?) DESC, name
         LIMIT ?`,
        [needle, needle, prefix, limit],
      );
      return rows.map(toFoodRow);
    },

    async getById(id: number): Promise<FoodRow | undefined> {
      const row = await db.first<RawFood>(`SELECT ${FOOD_COLS} FROM foods WHERE id = ?`, [id]);
      return row ? toFoodRow(row) : undefined;
    },

    async insert(f: FoodInput): Promise<number> {
      const result = await db.run(
        `INSERT INTO foods (name, brand, source, barcode, kcal_100g, protein_100g, carbs_100g, fat_100g, fiber_100g, sugar_100g, sodium_mg_100g)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          f.name,
          f.brand ?? null,
          f.source,
          f.barcode ?? null,
          f.per100.kcal,
          f.per100.protein,
          f.per100.carbs,
          f.per100.fat,
          f.per100.fiber ?? null,
          f.per100.sugar ?? null,
          f.per100.sodiumMg ?? null,
        ],
      );
      return result.lastInsertRowId;
    },

    async update(id: number, f: FoodInput): Promise<void> {
      await db.run(
        `UPDATE foods SET name=?, brand=?, source=?, barcode=?, kcal_100g=?, protein_100g=?, carbs_100g=?, fat_100g=?, fiber_100g=?, sugar_100g=?, sodium_mg_100g=?
         WHERE id=?`,
        [
          f.name,
          f.brand ?? null,
          f.source,
          f.barcode ?? null,
          f.per100.kcal,
          f.per100.protein,
          f.per100.carbs,
          f.per100.fat,
          f.per100.fiber ?? null,
          f.per100.sugar ?? null,
          f.per100.sodiumMg ?? null,
          id,
        ],
      );
    },

    async softDelete(id: number): Promise<void> {
      await db.run(`UPDATE foods SET deleted = 1 WHERE id = ?`, [id]);
    },

    async servingsFor(foodId: number): Promise<Serving[]> {
      return db.all<{ label: string; grams: number }>(
        `SELECT label, grams FROM food_servings WHERE food_id = ? ORDER BY id`,
        [foodId],
      );
    },

    async setServings(foodId: number, servings: Serving[]): Promise<void> {
      await db.run(`DELETE FROM food_servings WHERE food_id = ?`, [foodId]);
      for (const s of servings) {
        await db.run(`INSERT INTO food_servings (food_id, label, grams) VALUES (?, ?, ?)`, [
          foodId,
          s.label,
          s.grams,
        ]);
      }
    },
  };
}

export function recipesDao(db: DbAdapter) {
  return {
    async list(): Promise<RecipeRow[]> {
      const rows = await db.all<{ id: number; name: string; servings: number; notes: string | null }>(
        `SELECT id, name, servings, notes FROM recipes WHERE deleted = 0 ORDER BY name`,
      );
      return rows.map((r) => ({ ...r, notes: r.notes ?? undefined }));
    },

    async getById(id: number): Promise<RecipeRow | undefined> {
      const r = await db.first<{ id: number; name: string; servings: number; notes: string | null }>(
        `SELECT id, name, servings, notes FROM recipes WHERE id = ?`,
        [id],
      );
      return r ? { ...r, notes: r.notes ?? undefined } : undefined;
    },

    async insert(r: { name: string; servings: number; notes?: string }): Promise<number> {
      const result = await db.run(`INSERT INTO recipes (name, servings, notes) VALUES (?, ?, ?)`, [
        r.name,
        r.servings,
        r.notes ?? null,
      ]);
      return result.lastInsertRowId;
    },

    async update(id: number, r: { name: string; servings: number; notes?: string }): Promise<void> {
      await db.run(`UPDATE recipes SET name=?, servings=?, notes=? WHERE id=?`, [
        r.name,
        r.servings,
        r.notes ?? null,
        id,
      ]);
    },

    async softDelete(id: number): Promise<void> {
      await db.run(`UPDATE recipes SET deleted = 1 WHERE id = ?`, [id]);
    },

    async itemsFor(recipeId: number): Promise<RecipeItemRow[]> {
      const rows = await db.all<RawFood & { item_id: number; grams: number; food_id: number }>(
        `SELECT ri.id AS item_id, ri.grams AS grams, ri.food_id AS food_id, ${FOOD_COLS
          .split(', ')
          .map((c) => `f.${c}`)
          .join(', ')}
         FROM recipe_items ri JOIN foods f ON f.id = ri.food_id
         WHERE ri.recipe_id = ? ORDER BY ri.id`,
        [recipeId],
      );
      return rows.map((r) => ({
        id: r.item_id,
        foodId: r.food_id,
        grams: r.grams,
        foodName: r.name,
        per100: toFoodRow(r).per100,
      }));
    },

    async setItems(recipeId: number, items: { foodId: number; grams: number }[]): Promise<void> {
      await db.run(`DELETE FROM recipe_items WHERE recipe_id = ?`, [recipeId]);
      for (const i of items) {
        await db.run(`INSERT INTO recipe_items (recipe_id, food_id, grams) VALUES (?, ?, ?)`, [
          recipeId,
          i.foodId,
          i.grams,
        ]);
      }
    },
  };
}

export function diaryDao(db: DbAdapter) {
  interface RawEntry {
    id: number;
    date: string;
    meal: Meal;
    food_id: number | null;
    recipe_id: number | null;
    grams: number;
    qty: number;
    unit_label: string;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    name: string | null;
  }

  return {
    async forDate(dateKey: string): Promise<DiaryEntryRow[]> {
      const rows = await db.all<RawEntry>(
        `SELECT d.id, d.date, d.meal, d.food_id, d.recipe_id, d.grams, d.qty, d.unit_label,
                d.kcal, d.protein, d.carbs, d.fat,
                COALESCE(f.name, r.name) AS name
         FROM diary_entries d
         LEFT JOIN foods f ON f.id = d.food_id
         LEFT JOIN recipes r ON r.id = d.recipe_id
         WHERE d.date = ?
         ORDER BY d.id`,
        [dateKey],
      );
      return rows.map((r) => ({
        id: r.id,
        date: r.date,
        meal: r.meal,
        foodId: r.food_id ?? undefined,
        recipeId: r.recipe_id ?? undefined,
        grams: r.grams,
        qty: r.qty,
        unitLabel: r.unit_label,
        kcal: r.kcal,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat,
        name: r.name ?? '(deleted)',
      }));
    },

    async add(e: NewDiaryEntry): Promise<number> {
      const result = await db.run(
        `INSERT INTO diary_entries (date, meal, food_id, recipe_id, grams, qty, unit_label, kcal, protein, carbs, fat)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          e.date,
          e.meal,
          e.foodId ?? null,
          e.recipeId ?? null,
          e.grams,
          e.qty,
          e.unitLabel,
          e.kcal,
          e.protein,
          e.carbs,
          e.fat,
        ],
      );
      return result.lastInsertRowId;
    },

    async update(
      id: number,
      patch: {
        meal?: Meal;
        grams: number;
        qty: number;
        unitLabel: string;
        kcal: number;
        protein: number;
        carbs: number;
        fat: number;
      },
    ): Promise<void> {
      if (patch.meal !== undefined) {
        await db.run(`UPDATE diary_entries SET meal=? WHERE id=?`, [patch.meal, id]);
      }
      await db.run(
        `UPDATE diary_entries SET grams=?, qty=?, unit_label=?, kcal=?, protein=?, carbs=?, fat=? WHERE id=?`,
        [patch.grams, patch.qty, patch.unitLabel, patch.kcal, patch.protein, patch.carbs, patch.fat, id],
      );
    },

    async remove(id: number): Promise<void> {
      await db.run(`DELETE FROM diary_entries WHERE id = ?`, [id]);
    },
  };
}

export function exercisesDao(db: DbAdapter) {
  interface RawExercise {
    id: number;
    name: string;
    category: ExerciseCategory;
    primary_muscles: string;
    secondary_muscles: string;
    is_custom: number;
  }

  const toRow = (r: RawExercise): ExerciseRow => ({
    id: r.id,
    name: r.name,
    category: r.category,
    primary: JSON.parse(r.primary_muscles) as MuscleId[],
    secondary: JSON.parse(r.secondary_muscles) as MuscleId[],
    isCustom: r.is_custom === 1,
  });

  const COLS = 'id, name, category, primary_muscles, secondary_muscles, is_custom';

  return {
    async list(): Promise<ExerciseRow[]> {
      const rows = await db.all<RawExercise>(
        `SELECT ${COLS} FROM exercises WHERE deleted = 0 ORDER BY name`,
      );
      return rows.map(toRow);
    },

    async search(q: string, limit = 50): Promise<ExerciseRow[]> {
      const needle = `%${q.toLowerCase()}%`;
      const prefix = `${q.toLowerCase()}%`;
      const rows = await db.all<RawExercise>(
        `SELECT ${COLS} FROM exercises
         WHERE deleted = 0 AND LOWER(name) LIKE ?
         ORDER BY (LOWER(name) LIKE ?) DESC, name LIMIT ?`,
        [needle, prefix, limit],
      );
      return rows.map(toRow);
    },

    async getById(id: number): Promise<ExerciseRow | undefined> {
      const r = await db.first<RawExercise>(`SELECT ${COLS} FROM exercises WHERE id = ?`, [id]);
      return r ? toRow(r) : undefined;
    },

    async insertCustom(e: {
      name: string;
      category: ExerciseCategory;
      primary: MuscleId[];
      secondary: MuscleId[];
    }): Promise<number> {
      return insertExercise(db, e, true);
    },

    async insertSeed(e: {
      name: string;
      category: ExerciseCategory;
      primary: MuscleId[];
      secondary: MuscleId[];
    }): Promise<number> {
      return insertExercise(db, e, false);
    },

    async softDelete(id: number): Promise<void> {
      await db.run(`UPDATE exercises SET deleted = 1 WHERE id = ?`, [id]);
    },
  };
}

export function workoutsDao(db: DbAdapter) {
  interface RawWorkout {
    id: number;
    date: string;
    exercise_id: number;
    sets: string;
    notes: string | null;
    unilateral: number;
    name: string;
    category: ExerciseCategory;
    primary_muscles: string;
    secondary_muscles: string;
  }

  return {
    async forDate(dateKey: string): Promise<WorkoutEntryRow[]> {
      const rows = await db.all<RawWorkout>(
        `SELECT w.id, w.date, w.exercise_id, w.sets, w.notes, w.unilateral,
                e.name, e.category, e.primary_muscles, e.secondary_muscles
         FROM workout_entries w JOIN exercises e ON e.id = w.exercise_id
         WHERE w.date = ? ORDER BY w.id`,
        [dateKey],
      );
      return rows.map((r) => ({
        id: r.id,
        date: r.date,
        exerciseId: r.exercise_id,
        name: r.name,
        category: r.category,
        primary: JSON.parse(r.primary_muscles) as MuscleId[],
        secondary: JSON.parse(r.secondary_muscles) as MuscleId[],
        sets: JSON.parse(r.sets) as WorkoutSets,
        notes: r.notes ?? undefined,
        unilateral: r.unilateral === 1,
      }));
    },

    async add(e: {
      date: string;
      exerciseId: number;
      sets: WorkoutSets;
      notes?: string;
      unilateral?: boolean;
    }): Promise<number> {
      const result = await db.run(
        `INSERT INTO workout_entries (date, exercise_id, sets, notes, unilateral) VALUES (?, ?, ?, ?, ?)`,
        [e.date, e.exerciseId, JSON.stringify(e.sets), e.notes ?? null, e.unilateral ? 1 : 0],
      );
      return result.lastInsertRowId;
    },

    async update(
      id: number,
      patch: { sets: WorkoutSets; notes?: string; unilateral?: boolean },
    ): Promise<void> {
      await db.run(`UPDATE workout_entries SET sets=?, notes=?, unilateral=? WHERE id=?`, [
        JSON.stringify(patch.sets),
        patch.notes ?? null,
        patch.unilateral ? 1 : 0,
        id,
      ]);
    },

    async remove(id: number): Promise<void> {
      await db.run(`DELETE FROM workout_entries WHERE id = ?`, [id]);
    },

    /** Most recent entry for this exercise strictly before dateKey. */
    async lastBefore(
      exerciseId: number,
      dateKey: string,
    ): Promise<{ date: string; sets: WorkoutSets } | undefined> {
      const row = await db.first<{ date: string; sets: string }>(
        `SELECT date, sets FROM workout_entries
         WHERE exercise_id = ? AND date < ?
         ORDER BY date DESC, id DESC LIMIT 1`,
        [exerciseId, dateKey],
      );
      return row ? { date: row.date, sets: JSON.parse(row.sets) as WorkoutSets } : undefined;
    },

    /** Every session for one exercise, oldest first (for progress charts). */
    async historyForExercise(exerciseId: number): Promise<{ date: string; sets: WorkoutSets }[]> {
      const rows = await db.all<{ date: string; sets: string }>(
        `SELECT date, sets FROM workout_entries WHERE exercise_id = ? ORDER BY date, id`,
        [exerciseId],
      );
      return rows.map((r) => ({ date: r.date, sets: JSON.parse(r.sets) as WorkoutSets }));
    },

    /** Distinct strength exercises the user has actually logged. */
    async loggedExercises(): Promise<{ id: number; name: string }[]> {
      return db.all<{ id: number; name: string }>(
        `SELECT DISTINCT w.exercise_id AS id, e.name
         FROM workout_entries w JOIN exercises e ON e.id = w.exercise_id
         WHERE e.category = 'strength'
         ORDER BY e.name`,
      );
    },
  };
}

export function bodyweightDao(db: DbAdapter) {
  return {
    /** Upsert one entry per day (overwrite the same date). */
    async set(date: string, weight: number): Promise<void> {
      await db.run(
        `INSERT INTO bodyweight_entries (date, weight) VALUES (?, ?)
         ON CONFLICT(date) DO UPDATE SET weight = excluded.weight`,
        [date, weight],
      );
    },

    async latest(): Promise<{ date: string; weight: number } | undefined> {
      return db.first<{ date: string; weight: number }>(
        `SELECT date, weight FROM bodyweight_entries ORDER BY date DESC LIMIT 1`,
      );
    },

    async history(): Promise<{ date: string; weight: number }[]> {
      return db.all<{ date: string; weight: number }>(
        `SELECT date, weight FROM bodyweight_entries ORDER BY date`,
      );
    },
  };
}

export function settingsDao(db: DbAdapter) {
  return {
    async get(key: string): Promise<string | undefined> {
      const row = await db.first<{ value: string }>(`SELECT value FROM settings WHERE key = ?`, [key]);
      return row?.value;
    },

    async set(key: string, value: string): Promise<void> {
      await db.run(
        `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [key, value],
      );
    },

    async getNum(key: string, fallback: number): Promise<number> {
      const raw = await this.get(key);
      const n = raw === undefined ? NaN : Number(raw);
      return Number.isFinite(n) ? n : fallback;
    },
  };
}

async function insertExercise(
  db: DbAdapter,
  e: { name: string; category: ExerciseCategory; primary: MuscleId[]; secondary: MuscleId[] },
  isCustom: boolean,
): Promise<number> {
  const result = await db.run(
    `INSERT INTO exercises (name, category, primary_muscles, secondary_muscles, is_custom)
     VALUES (?, ?, ?, ?, ?)`,
    [e.name, e.category, JSON.stringify(e.primary), JSON.stringify(e.secondary), isCustom ? 1 : 0],
  );
  return result.lastInsertRowId;
}
