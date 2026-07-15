# PIKE TRACKER — Design Spec

Date: 2026-07-15
Status: Approved (user delegated decisions: "tell me what you think is best and proceed with development")

## 1. Purpose

Minimalist mobile fitness app. Two pillars:

1. **Calorie diary** — log foods per day, browse past/future days, search common foods, create and log recipes, multiple measurement units (grams primary).
2. **Workout diary** — log workouts per day from a seeded exercise list, add custom exercises with manual muscle selection, and see a polygonal body figure with worked muscles highlighted white.

UI: dark, monochrome (blacks/greys), Windows-XP-flavored chrome — beveled buttons, title bars, sunken panels. Playful, tactile, haptic.

## 2. Tech Stack (decided)

| Concern | Choice | Why |
|---|---|---|
| Framework | **React Native via Expo (managed), TypeScript** | Dev on Windows, live-test on iPhone with Expo Go, EAS cloud builds for App Store later without a Mac. Flutter rejected: iOS build/test requires macOS. |
| Navigation | expo-router (file-based, tabs) | Standard, minimal boilerplate. |
| Storage | expo-sqlite (SQLite, offline-first) | Structured relational data: foods, recipes, diary, workouts. |
| State | zustand | Tiny, no ceremony. |
| Graphics | react-native-svg | Polygonal muscle figure, XP progress bars. |
| Haptics | expo-haptics | "Satisfying to the touch." |
| Dates | date-fns | Day math for diary navigation. |
| Tests | jest-expo + pure-TS lib modules | Nutrition math, unit conversion, muscle aggregation are pure functions — unit-testable without device. |

No backend. All data local to device. (Cloud sync = future work, out of scope.)

## 3. Architecture

```
app/                    # expo-router routes
  (tabs)/
    index.tsx           # Diary (food) — default tab
    workouts.tsx        # Workout log + muscle figure
    recipes.tsx         # Recipe list
    settings.tsx        # Goals, units
  food-search.tsx       # modal: search foods to log
  food-detail.tsx       # modal: pick quantity/unit, confirm log
  recipe-edit.tsx       # modal: create/edit recipe
  exercise-search.tsx   # modal: pick exercise to log
  exercise-edit.tsx     # modal: create custom exercise (muscle picker)
  workout-entry.tsx     # modal: sets/reps/weight entry
src/
  db/                   # SQLite: schema, migrations, DAOs (thin)
  lib/                  # PURE logic: nutrition math, units, muscle aggregation, date utils
  seed/                 # seed foods (~200) + seed exercises (~70) as TS data
  state/                # zustand stores (selected date, settings cache)
  ui/                   # XP design system components
  figure/               # polygonal body SVG + muscle-highlight logic
```

Rule: `lib/` is pure TS, no React/RN imports — fully unit-tested. UI stays thin.

## 4. Data Model (SQLite)

```sql
foods(id, name, brand, source TEXT,          -- 'seed' | 'custom' | 'off'(Open Food Facts)
      kcal_100g, protein_100g, carbs_100g, fat_100g,
      fiber_100g, sugar_100g, sodium_mg_100g,   -- nullable extras
      barcode, deleted INTEGER DEFAULT 0, created_at)

food_servings(id, food_id, label, grams)     -- "1 cup" = 240g, "1 slice" = 28g

recipes(id, name, servings REAL, notes, deleted, created_at)
recipe_items(id, recipe_id, food_id, grams)

diary_entries(id, date TEXT /*YYYY-MM-DD*/, meal TEXT, -- breakfast|lunch|dinner|snacks
      food_id, recipe_id,                    -- exactly one set
      grams REAL,                            -- resolved amount (recipes: servings→grams)
      qty REAL, unit_label TEXT,             -- what the user typed, for display/edit
      kcal, protein, carbs, fat,             -- snapshot at log time
      created_at)

exercises(id, name, category TEXT,           -- 'strength' | 'cardio'
      primary_muscles TEXT,                  -- JSON array of muscle ids
      secondary_muscles TEXT,
      is_custom INTEGER, deleted, created_at)

workout_entries(id, date TEXT, exercise_id,
      sets TEXT,                             -- JSON: [{reps, weight}] or {durationMin}
      notes, created_at)

settings(key TEXT PRIMARY KEY, value TEXT)   -- kcalGoal, proteinGoal, weightUnit...
```

Diary entries snapshot macros at log time (history stays stable if a food is edited later); editing an entry recomputes. Foods/recipes soft-delete so old diary rows keep working.

## 5. Canonical Muscle IDs (14)

`shoulders, chest, biceps, triceps, forearms, abs, obliques, lats, traps, lower_back, glutes, quads, hamstrings, calves`

Custom exercises pick from this list (primary + optional secondary). The figure highlights the union of muscles from the selected day's workout entries: **primary = solid white fill, secondary = dim grey fill**.

## 6. Feature Behavior

### Diary (food)
- Header: `‹ [date] ›` navigation + "Today" shortcut. Any past/future date reachable — logging in advance works by construction.
- Four meal sections (Breakfast, Lunch, Dinner, Snacks), each with entries + Add button.
- Day summary: XP-style segmented progress bar — kcal consumed vs goal, plus protein/carbs/fat row.
- Add flow: search screen → results list (local foods, recipes, custom) → detail screen → qty + unit picker (grams always; per-food servings like "1 slice"; oz) → LOG. Haptic on log.
- Food search: instant local search (seed + custom + previously-cached). Button: "SEARCH ONLINE" → Open Food Facts API (free, no key), results cached into local DB when logged. Offline: local only, online row disabled.

### Recipes
- Create: name, target servings, add ingredient rows (food search + grams each). Macros computed per recipe and per serving.
- Log a recipe from diary add-flow by servings (e.g. 1.5 servings).

### Workouts
- Same date navigation as diary (shared selected-date store: switching tabs keeps the day).
- Day list of logged exercises with sets×reps×weight summary.
- Add flow: exercise search (seeded ~70 common strength/cardio movements) → sets entry (strength: reps+weight rows, duplicate-last-set button; cardio: duration).
- "CREATE EXERCISE" when search misses: name, category, tap muscles on a mini figure / checkbox list (primary + secondary).
- **Muscle figure**: top of Workouts tab. Front + back low-poly SVG bodies side by side (like reference image). Worked muscles for the selected day fill white (primary) / grey (secondary) with a short fade-in animation. No workouts = fully dark figure.

### Settings
- Daily kcal goal, optional protein/carb/fat goals, weight unit (kg/lb).

## 7. XP-Dark Design System

Palette (monochrome):
- bg `#0b0b0d`, surface `#141417`, raised `#1e1e22`, borderLight `#3a3a40`, borderDark `#000`, text `#e6e6ea`, textDim `#8a8a92`, highlight `#ffffff`.

Components (`src/ui/`):
- **Window**: raised 2px bevel (light top/left, dark bottom/right), title bar with title text + decorative ✕ — the playful XP wink.
- **BevelButton**: raised bevel; onPressIn = bevel inverts (sunken) + `Haptics.impactAsync(Light)`; onPress action. This is the core "satisfying" interaction, used everywhere.
- **SunkenPanel**: inset field wells (inputs, lists).
- **XPProgress**: segmented block progress bar (discrete chunks, not smooth), white blocks on dark well.
- **TabBar**: bottom taskbar-styled: raised strip, each tab a taskbar button (active = sunken).
- Typography: system font, bold chunky title-bar text. No color accents anywhere — hierarchy via bevels, brightness, weight.

## 8. Seed Data

- **Foods (~200)**: common whole + staple foods (chicken breast, rice, oats, eggs, breads, fruits, vegetables, dairy, nuts, common snacks), per-100g macros from USDA-typical values, each with sensible servings ("1 egg = 50g", "1 cup cooked = 195g").
- **Exercises (~70)**: barbell/dumbbell/machine/bodyweight staples + common cardio, each pre-mapped to primary/secondary muscle ids.

## 9. Error Handling

- SQLite ops wrapped; failures surface as XP-style dialog (Window component) with retry — never silent.
- Open Food Facts: 8s timeout, offline/failure shows "ONLINE SEARCH UNAVAILABLE" row; local results unaffected.
- Date navigation clamped to valid dates only (no other limits).
- Deleting a food/recipe referenced by diary: soft-delete; existing entries keep snapshots.

## 10. Testing

- Unit (jest-expo, node): nutrition math (per-100g → qty/unit), serving conversions, recipe per-serving math, muscle aggregation (union, primary-over-secondary precedence), date utils, DAO SQL builders where pure.
- Manual/visual: Expo web in browser for layout; Expo Go on iPhone for haptics + real feel.

## 11. Out of Scope (V1)

Accounts/cloud sync, barcode scanning, micronutrients beyond the listed fields, workout templates/routines, progress charts, notifications, Android-store polish (app still runs on Android via Expo).

## 12. Build Order (phases)

1. Scaffold Expo app + design-system components (visual foundation first).
2. DB layer + seed data + pure lib (tested).
3. Diary: date nav, meals, add-food flow, totals.
4. Recipes.
5. Workouts: log flow, custom exercises.
6. Muscle figure.
7. Online food search (Open Food Facts).
8. Settings + polish (haptics everywhere, animations).
