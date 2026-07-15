# PIKE TRACKER Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline execution chosen — harness rules forbid unsolicited subagents). Steps use checkbox (`- [ ]`) syntax for tracking. Spec: `docs/superpowers/specs/2026-07-15-pike-tracker-design.md` — read it; it is the requirements source for all UI behavior.

**Goal:** Offline-first Expo/React Native fitness app: calorie diary with food search + recipes, workout diary with polygonal muscle-highlight figure, XP-dark monochrome UI.

**Architecture:** expo-router tab app. All persistent data in SQLite behind a tiny adapter interface (expo-sqlite on device/web, better-sqlite3 in jest so DAOs are really tested). All math/aggregation in pure TS `src/lib` (TDD). UI composes a small XP-bevel design system.

**Tech Stack:** Expo (latest SDK, managed), TypeScript strict, expo-router, expo-sqlite, expo-haptics, react-native-svg, zustand, date-fns, jest + ts-jest + better-sqlite3 (dev only).

## Global Constraints

- TypeScript `strict: true`; no `any` in committed code.
- Monochrome palette only — tokens from `src/ui/theme.ts`; no color literals in screens.
- All dates as `YYYY-MM-DD` strings ("dateKey") at storage/API boundaries.
- Muscle ids (14, canonical): `shoulders chest biceps triceps forearms abs obliques lats traps lower_back glutes quads hamstrings calves`.
- `src/lib/**` and `src/db/**` must not import React/React Native (expo-sqlite import allowed only in `src/db/expoAdapter.ts`).
- Every task ends: `npm test` green + `npx tsc --noEmit` clean + commit.
- Commit messages: conventional (`feat:`, `test:`, `chore:`).

---

### Task 1: Scaffold

**Files:** Create `package.json`, `app.json`, `tsconfig.json`, `jest.config.js`, `.gitignore`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/workouts.tsx`, `app/(tabs)/recipes.tsx`, `app/(tabs)/settings.tsx`, `src/lib/smoke.test.ts`.

**Interfaces produced:** Running app shell with 4 tabs (Diary, Workouts, Recipes, Settings); `npm test`, `npm run typecheck` scripts.

- [ ] Manual scaffold (create-expo-app refuses non-empty dir): minimal `package.json` with `"main": "expo-router/entry"`, then `npx expo install expo expo-router expo-sqlite expo-haptics expo-status-bar react-native-svg react react-native react-native-safe-area-context react-native-screens expo-linking expo-constants` (expo install resolves compatible versions).
- [ ] `npm i zustand date-fns && npm i -D typescript @types/react jest ts-jest @types/jest @types/node better-sqlite3 @types/better-sqlite3`
- [ ] `app.json`: name PIKE TRACKER, slug pike-tracker, scheme piketracker, `"plugins": ["expo-router"]`, dark userInterfaceStyle, newArchEnabled true, web bundler metro. No icon/splash entries (V1).
- [ ] `jest.config.js`: ts-jest preset, `testMatch: ['**/src/**/*.test.ts']`, testEnvironment node.
- [ ] Tab layout with placeholder screens (plain text). Root `_layout.tsx`: Stack with `(tabs)` + dark background.
- [ ] `smoke.test.ts`: `expect(1+1).toBe(2)`. Run `npm test` → PASS. `npx tsc --noEmit` → clean.
- [ ] Verify boots: `npx expo start --web` renders tabs.
- [ ] Commit `chore: scaffold expo app with tabs, jest, typescript`.

### Task 2: XP-Dark Design System

**Files:** Create `src/ui/theme.ts`, `src/ui/Bevel.tsx`, `src/ui/BevelButton.tsx`, `src/ui/Window.tsx`, `src/ui/SunkenPanel.tsx`, `src/ui/XPProgress.tsx`, `src/ui/XPTextInput.tsx`, `src/ui/ListRow.tsx`, `src/ui/Screen.tsx`; Modify `app/(tabs)/_layout.tsx` (taskbar tab bar).

**Interfaces produced:**
```ts
// theme.ts
export const c = { bg:'#0b0b0d', surface:'#141417', raised:'#1e1e22', raisedHi:'#26262b',
  borderLight:'#3a3a40', borderDark:'#000000', text:'#e6e6ea', textDim:'#8a8a92',
  white:'#ffffff', well:'#0f0f11' } as const;
export const bevelUp: ViewStyle;   // 2px light top/left, dark bottom/right
export const bevelDown: ViewStyle; // inverted
// BevelButton: { title?, children?, onPress, small?, active?, disabled?, style? }
//   onPressIn: bevel inverts + Haptics.impactAsync(Light); active = stays sunken
// Window: { title, right?, children, style? } — title bar + decorative ✕, raised bevel
// SunkenPanel: { children, style? }
// XPProgress: { value, max, segments?=20 } — filled blocks white, over-goal blocks render dim
// XPTextInput: TextInputProps — sunken well styling
// ListRow: { title, subtitle?, right?, onPress?, onLongPress? }
// Screen: { title, children } — bg + safe area + Window wrapper
```
- [ ] Implement theme + components (haptics wrapped in `try/catch` — no-op on web).
- [ ] Tab bar: custom `tabBar` in `(tabs)/_layout.tsx` — raised taskbar strip, each tab a BevelButton with `active` = sunken. Labels: DIARY, LIFT, CHEF, SYS.
- [ ] Temporary showcase on Settings screen (all components) — visual check on web: bevels read correctly, press inverts.
- [ ] typecheck + tests green. Commit `feat: XP-dark design system components`.

### Task 3: Pure lib (TDD)

**Files:** Create `src/lib/types.ts`, `src/lib/dates.ts`, `src/lib/nutrition.ts`, `src/lib/units.ts`, `src/lib/muscles.ts` + matching `*.test.ts`.

**Interfaces produced:**
```ts
// types.ts
export type MuscleId = 'shoulders'|'chest'|'biceps'|'triceps'|'forearms'|'abs'|'obliques'
  |'lats'|'traps'|'lower_back'|'glutes'|'quads'|'hamstrings'|'calves';
export const ALL_MUSCLES: MuscleId[]; export const MUSCLE_LABELS: Record<MuscleId,string>;
export interface Macros { kcal:number; protein:number; carbs:number; fat:number }
export interface Per100 extends Macros { fiber?:number; sugar?:number; sodiumMg?:number }
export interface Serving { label:string; grams:number }
export type Unit = { kind:'g' } | { kind:'oz' } | { kind:'serving'; serving:Serving };
export type SetEntry = { reps:number; weight:number } // strength
export type CardioEntry = { durationMin:number }
// dates.ts
todayKey(): string; toKey(d:Date): string; addDaysKey(key:string, n:number): string;
dayTitle(key:string): string; // 'TODAY' | 'YESTERDAY' | 'TOMORROW' | 'TUE · JUL 14'
// nutrition.ts
macrosForGrams(per100:Per100, grams:number): Macros; // linear scale, round kcal to int, macros 1dp
sumMacros(items:Macros[]): Macros;
recipeTotals(items:{per100:Per100; grams:number}[]): Macros;
perServing(totals:Macros, servings:number): Macros;
// units.ts
gramsFor(qty:number, unit:Unit): number; // oz = 28.35 g/oz
unitLabel(unit:Unit): string;            // 'g' | 'oz' | serving.label
// muscles.ts
aggregateMuscles(w:{primary:MuscleId[]; secondary:MuscleId[]}[]): Partial<Record<MuscleId,'primary'|'secondary'>>; // primary wins over secondary
```
- [ ] TDD each module: failing tests → implement → green. Required cases: scaling (100g chicken 165kcal → 150g = 248), rounding, empty sums, recipe per-serving division, `addDaysKey('2026-01-01',-1)==='2025-12-31'`, dayTitle relative labels, oz conversion, serving grams, aggregate primary-over-secondary + union + empty.
- [ ] Commit `feat: pure domain lib (dates, nutrition, units, muscles)`.

### Task 4: DB layer (TDD via better-sqlite3)

**Files:** Create `src/db/adapter.ts`, `src/db/schema.ts`, `src/db/dao.ts`, `src/db/expoAdapter.ts`, `src/db/testAdapter.ts` (dev), `src/db/dao.test.ts`, `src/db/index.ts`.

**Interfaces produced:**
```ts
// adapter.ts
export interface DbAdapter { run(sql:string, params?:unknown[]): void;
  all<T>(sql:string, params?:unknown[]): T[]; first<T>(sql:string, params?:unknown[]): T|undefined;
  userVersion(): number; setUserVersion(v:number): void }
// schema.ts — MIGRATIONS: string[][]  (spec §4 tables); migrate(db:DbAdapter): void  (user_version pattern)
// dao.ts — class-free factories, all take DbAdapter:
foodsDao: search(q, limit=50) /* name+brand LIKE, not deleted, seed+custom+off */,
  getById, insert(food):id, update, softDelete, servingsFor(foodId):Serving[], setServings(foodId, Serving[])
recipesDao: list(), getById, insert({name,servings,notes}):id, update, softDelete,
  itemsFor(recipeId):{id,foodId,grams,foodName,per100}[] (JOIN foods), setItems(recipeId, {foodId,grams}[])
diaryDao: forDate(dateKey):DiaryEntry[], add(entry):id, update, remove(id)
exercisesDao: search(q), getById, list(), insertCustom({name,category,primary,secondary}):id, softDelete
workoutsDao: forDate(dateKey):WorkoutEntry[] (JOIN exercises for name+muscles), add, update, remove
settingsDao: get(key):string|undefined, set(key,value), getNum(key,fallback)
// DiaryEntry { id, date, meal:'breakfast'|'lunch'|'dinner'|'snacks', foodId?, recipeId?,
//   grams, qty, unitLabel, kcal, protein, carbs, fat, name (joined) }
// WorkoutEntry { id, date, exerciseId, name, category, primary:MuscleId[], secondary:MuscleId[], sets: SetEntry[]|CardioEntry, notes? }
```
- [ ] `testAdapter.ts`: better-sqlite3 in-memory implementing DbAdapter.
- [ ] TDD DAOs against real SQL: migrate idempotent (run twice), food insert/search (case-insensitive, brand match), soft-delete hidden from search but getById works, servings round-trip, recipe items JOIN returns per100, diary add/forDate ordered by created_at, workout JSON sets round-trip, settings upsert.
- [ ] `expoAdapter.ts`: wraps `openDatabaseSync('pike.db')` sync API. `index.ts`: lazy singleton `getDb()` → migrate + seed hook (seed fn injected Task 5).
- [ ] Commit `feat: sqlite layer with migrations and tested DAOs`.

### Task 5: Seed data

**Files:** Create `src/seed/foods.ts` (~200 entries `{name, per100, servings[]}` — staples: proteins, grains, dairy, fruit, veg, nuts, breads, snacks; USDA-typical values), `src/seed/exercises.ts` (~70 `{name, category, primary[], secondary[]}` — barbell/dumbbell/machine/bodyweight + cardio), `src/seed/index.ts` `seedIfEmpty(db)`, `src/seed/seed.test.ts`.

- [ ] Tests: counts (foods ≥150, exercises ≥60), every muscle id valid, per100 sanity (kcal≈4p+4c+9f ±25% where macros>0, no negatives), every food has ≥1 serving besides implicit grams, `seedIfEmpty` idempotent (run twice → same counts) — then write data to satisfy.
- [ ] Wire into `getDb()`. Commit `feat: seed foods and exercises`.

### Task 6: Diary tab

**Files:** Create `src/state/appStore.ts` (zustand: `dateKey`, `setDateKey`, `bump()` refresh counter), `src/components/DateNav.tsx` (‹ dayTitle › + TODAY button), `src/components/MacroSummary.tsx` (XPProgress kcal vs goal + P/C/F row); Rewrite `app/(tabs)/index.tsx`.

- [ ] Diary screen: DateNav → MacroSummary → four meal Windows (BREAKFAST/LUNCH/DINNER/SNACKS): entries as ListRow (title=name, subtitle=`{qty}{unitLabel} · {kcal} kcal`, long-press = delete confirm), ADD FOOD BevelButton → `/food-search?meal=breakfast&date=...`.
- [ ] Totals from `diaryDao.forDate` + `sumMacros`; goal from settings (default 2200).
- [ ] Verify on web (empty day, nav arrows move date, TODAY resets). Commit `feat: calorie diary day view`.

### Task 7: Food logging flow

**Files:** Create `app/food-search.tsx`, `app/food-detail.tsx` (modals in root Stack); Modify `app/_layout.tsx` (register modals).

- [ ] Search modal: XPTextInput autofocus, live `foodsDao.search` (debounce 150ms), sections MY RECIPES (matching) / FOODS; row subtitle `{kcal}/100g`; tap → food-detail (or recipe log detail Task 8). CREATE FOOD row → inline form (name, per100 fields, optional serving) → insert custom.
- [ ] Detail modal: qty XPTextInput (numeric), unit BevelButton group (g / oz / each serving), computed macro preview updates live, meal picker (4 buttons, preselected from param), LOG button → `diaryDao.add` snapshot via `macrosForGrams`+`gramsFor`, success haptic, `router.back()` ×2, diary refreshes (`bump`).
- [ ] Verify full loop on web: search rice → 185g → logs, totals update. Commit `feat: food search and logging flow`.

### Task 8: Recipes

**Files:** Rewrite `app/(tabs)/recipes.tsx` (list + per-serving kcal subtitle, NEW RECIPE button); Create `app/recipe-edit.tsx` (name, servings, ingredient rows via food-search in picker mode `?pick=1`, per-serving macro footer live via `recipeTotals`/`perServing`); Modify `app/food-search.tsx` (pick mode returns foodId via store callback; recipes section logs recipe → detail with servings qty).

- [ ] Logging a recipe: qty = servings count; snapshot macros = `perServing(totals) × qty`; grams = recipe grams/serving × qty.
- [ ] Verify: build 2-ingredient recipe, log 1.5 servings, diary correct. Commit `feat: recipes`.

### Task 9: Workouts tab

**Files:** Rewrite `app/(tabs)/workouts.tsx` (DateNav shared store → figure placeholder → entries list → ADD EXERCISE); Create `app/exercise-search.tsx`, `app/workout-entry.tsx`, `app/exercise-edit.tsx`.

- [ ] Entry list rows: name + `3×8 @ 60kg`-style summary (strength: `sets.length×maxReps @ topWeight` compact; cardio: `{durationMin} min`), long-press delete.
- [ ] workout-entry modal: strength = set rows (reps, weight inputs) + ADD SET (copies last) + DONE; cardio = duration. Edits existing entry when `?id=`.
- [ ] exercise-edit modal: name, category toggle, two muscle picker groups (checkbox ListRows from ALL_MUSCLES, primary + secondary) → `exercisesDao.insertCustom`.
- [ ] Verify: log bench press 3 sets, custom exercise with muscles, appears dated. Commit `feat: workout logging`.

### Task 10: Muscle figure

**Files:** Create `src/figure/bodyPolygons.ts` (`FRONT: FigurePoly[]`, `BACK: FigurePoly[]`; `FigurePoly = { muscle: MuscleId|'silhouette'; points: string }` — hand-crafted low-poly front+back bodies on 0-100 × 0-220 viewBox each, faceted like spec reference), `src/figure/MuscleFigure.tsx` (`{ highlights: Partial<Record<MuscleId,'primary'|'secondary'>> }` — silhouette polys `c.raised` with `c.borderLight` strokes; muscle polys: default `#232327`, secondary `#6a6a72`, primary `#ffffff`; 250ms opacity fade on change), `src/figure/figure.test.ts` (every non-silhouette muscle id valid; both views cover all 14 ids between them; points parse as even-length number lists).

- [ ] Integrate top of Workouts tab inside Window "MUSCLES WORKED": `aggregateMuscles(workoutsDao.forDate(...))`.
- [ ] Visual check web: bench day → chest/shoulders/triceps white; empty day dark. Iterate polygon coordinates until silhouette reads human (front + back, arms slightly out, faceted).
- [ ] Commit `feat: polygonal muscle figure`.

### Task 11: Online food search (Open Food Facts)

**Files:** Create `src/lib/off.ts` (`mapOffProduct(json): {name, brand?, per100:Per100, barcode?} | null` — rejects items missing kcal or macros; handles `energy-kcal_100g` vs kJ fallback ÷4.184), `src/lib/off.test.ts` (fixture JSONs: complete product, kJ-only, junk → null), `src/services/offSearch.ts` (fetch `https://world.openfoodfacts.org/cgi/search.pl?search_terms=…&json=1&page_size=20&fields=product_name,brands,code,nutriments`, 8s AbortController timeout); Modify `app/food-search.tsx` (SEARCH ONLINE BevelButton under local results → loading → OFF section; logging an OFF item first `foodsDao.insert({source:'off'})` then normal flow; failure row "ONLINE SEARCH UNAVAILABLE").

- [ ] TDD mapper. Manual web verify (may need CORS luck on web — verify device later; failure path must render). Commit `feat: open food facts online search`.

### Task 12: Settings, goals, polish

**Files:** Rewrite `app/(tabs)/settings.tsx` (remove showcase): KCAL GOAL, PROTEIN/CARBS/FAT GOALS (optional), WEIGHT UNIT kg/lb toggle (workout entry labels), ABOUT window. Modify diary MacroSummary (macro goals shown when set), workout-entry (unit label).

- [ ] Polish pass: haptics on all primary actions (log success = `notificationAsync(Success)`), empty states ("NOTHING LOGGED — C:\>_" style playful monochrome copy), delete confirms via XP dialog Window, figure fade verified, over-goal progress renders dim-white overflow.
- [ ] Final: `npm test` all green, `npx tsc --noEmit` clean, web click-through of every flow, update README.md (what it is, how to run: `npx expo start` + Expo Go on iPhone).
- [ ] Commit `feat: settings and polish`.

---

## Self-review notes

- Spec coverage: §1-§8 map to tasks 1-12 (spec §6 diary/recipes/workouts/settings → tasks 6-9,12; §5 muscles → 3,9,10; §4 → 4; §8 → 5; online search → 11). Barcode column exists in schema, scanning out of scope (spec §11). ✔
- Type names consistent across tasks (Per100, Macros, Serving, Unit, MuscleId, DiaryEntry, WorkoutEntry, DbAdapter). ✔
- No TBDs. UI composition detail delegated to spec §6-§7 deliberately; executor holds spec in context. ✔
