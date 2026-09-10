# Barcode scanning + micronutrient breakdown — Design Spec

Date: 2026-07-30
Status: Approved

## Context

Open Food Facts (OFF) is already integrated for online text search (`src/services/offSearch.ts` → `mapOffProduct` → SEARCH ONLINE button in the add-food screen; results logged with `source = 'off'`). Two additions:

1. **Barcode scanning** — a SCAN button next to CREATE FOOD in the add-food screen opens the device camera, reads a product barcode, looks it up in OFF, and goes straight to the log screen with the matched product.
2. **"Nutrients" dropdown** — an expandable section on the food-detail (log) screen showing the food's micronutrient breakdown. This is the "more robust data" ask: capture and store micronutrients from OFF, not just macros.

Current `foods` columns store only kcal/protein/carbs/fat + fiber/sugar/sodium. Micronutrients are not captured today.

## 1. Micronutrient storage — one JSON column

Migration v3 adds a nullable column:
```sql
ALTER TABLE foods ADD COLUMN micros TEXT;   -- JSON array of {label, amount, unit}, or NULL
```
Chosen over per-nutrient columns because micros are only ever displayed, never queried — a JSON blob is flexible (any OFF field) and needs no schema churn per nutrient.

`Micro` shape (pure type in `src/lib/off.ts`):
```ts
interface Micro { label: string; amount: number; unit: string }
```

`mapOffProduct` gains a `micros: Micro[]` on `OffFood`, extracted from a curated table of OFF nutriment keys (per 100 g), each with a display label + unit. Only present, finite, non-negative values are included. Curated set:

| OFF key (`*_100g`) | Label | Unit |
|---|---|---|
| saturated-fat | Saturated fat | g |
| trans-fat | Trans fat | g |
| cholesterol | Cholesterol | mg |
| fiber | Fiber | g |
| sugars | Sugars | g |
| salt | Salt | g |
| sodium | Sodium | mg |
| calcium | Calcium | mg |
| iron | Iron | mg |
| potassium | Potassium | mg |
| magnesium | Magnesium | mg |
| zinc | Zinc | mg |
| vitamin-a | Vitamin A | µg |
| vitamin-c | Vitamin C | mg |
| vitamin-d | Vitamin D | µg |

OFF reports most of these in base SI units per 100 g (grams for salt/fiber, grams for sodium/calcium/etc.). A per-key `scale` converts to the display unit (e.g. sodium/calcium/iron/potassium/magnesium/zinc/cholesterol g→mg ×1000; vitamin-a/d g→µg ×1e6; vitamin-c g→mg ×1000). Amounts rounded to at most 2 significant decimals for display.

## 2. Data layer

- **DAO** (`src/db/dao.ts`): `FoodRow` and `FoodInput` gain optional `micros?: Micro[]`. `foodsDao.insert`/`update` serialize `micros` to the new column (`JSON.stringify` or null); `getById`/`search` parse it back (search may skip micros for lightness — only `getById` needs them, since the detail screen loads by id). `FoodRow.micros` populated in `getById`.
- **Migration** appended as `MIGRATIONS[3]` in `src/db/schema.ts`. `migrate()` stamps `user_version = 4`.
- Seed/custom foods insert `micros = null`.

## 3. OFF service

`src/services/offSearch.ts`:
- Shared `OFF_FIELDS` constant listing `product_name,brands,code,nutriments` (nutriments already returns all keys, so the curated extraction happens in the mapper — no per-field request needed; keep `nutriments`).
- New `fetchOffByBarcode(barcode: string): Promise<OffFood | null>` → `GET https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,code,nutriments`, 8 s timeout (same as search). Returns `mapOffProduct(json.product)` when `json.status === 1`, else null. Throws on network/timeout (caller shows a message).

## 4. Barcode scan screen

New modal route `app/barcode-scan.tsx` (registered in `app/_layout.tsx` `<Stack>` as `presentation: 'modal'`), reached with a `meal` param.

- Uses `expo-camera` `CameraView` (pinned to SDK 54 via `npx expo install expo-camera`). Requests camera permission via `useCameraPermissions`; if denied, shows a message with a grant button.
- `barcodeScannerSettings={{ barcodeTypes: ['ean13','ean8','upc_a','upc_e'] }}`, `onBarcodeScanned` guarded by a `scanned` ref so it fires once per scan.
- On scan → `fetchOffByBarcode(code)`:
  - **Hit**: `foodsDao.insert({ ...off, source: 'off', barcode, micros })`, then `router.replace({ pathname: '/food-detail', params: { foodId, meal } })` — straight to the log screen.
  - **Miss / status 0**: overlay "NOT FOUND · {code}" with RESCAN and CLOSE (no auto-create, per decision).
  - **Network error**: "LOOKUP FAILED" with RESCAN.
- **Web**: `CameraView` needs `getUserMedia`, unavailable in the preview iframe. On `Platform.OS === 'web'`, render a "SCANNING NEEDS A DEVICE" panel instead of the camera (keeps the web build working; scanning verified on device).

## 5. Add-food screen change

`app/food-search.tsx`: place a **SCAN** `BevelButton` next to the existing **+ CREATE FOOD** button (a row), routing to `/barcode-scan` with the current `meal`. Only shown when not in recipe-ingredient pick mode.

## 6. Nutrients dropdown on food-detail

`app/food-detail.tsx`: below the macro summary line, add a collapsible **NUTRIENTS ▾ / ▴** section (local `useState` open flag; a `BevelButton` toggle).
- Expanded: list each `food.micros` entry as `Label … amount unit` (mono, in a `SunkenPanel`).
- If `micros` is empty/absent, fall back to showing the `per100` extras that exist (fiber/sugar/sodium); if none, "NO MICRONUTRIENT DATA".
- Values are per 100 g (labelled as such), consistent with how the macro line reads.

## 7. Error handling

- OFF barcode lookup: 8 s timeout; network failure and not-found both surface as on-screen messages with a rescan path — never silent.
- Camera permission denied: explicit message + grant button; no crash.
- Malformed OFF product (missing name/energy/macros): `mapOffProduct` already returns null → treated as not-found.
- Duplicate scans: `scanned` ref prevents re-entrancy until reset by RESCAN.

## 8. Testing

- Unit (jest, no RN runtime): `mapOffProduct` micros extraction (fixture with micronutrients → correct labels/units/scaling; absent nutriments → empty micros); `fetchOffByBarcode` mapping via a stubbed `fetch` (status 1 product → OffFood; status 0 → null). Extend `off.test.ts`.
- DAO: `foodsDao` insert→getById round-trip of `micros`; null when omitted. Migrate-idempotency covers v3.
- Manual/web: SCAN button present next to CREATE FOOD; feed a real barcode to `fetchOffByBarcode` and confirm the food logs with a populated NUTRIENTS dropdown; food-detail dropdown expands/collapses; "no data" fallback for a seed food.
- **Device-only**: the camera scan itself (Expo Go) — cannot run in web preview.

## 9. Dependencies

- `expo-camera` (SDK 54 pin via `expo install`). Adds a camera-permission declaration to `app.json` (`expo-camera` plugin with `cameraPermission` string). No other native deps.

## 10. Out of scope

Auto-creating a custom food from an unknown barcode (decided against — plain "not found"); editing micronutrients by hand; nutrient goals/tracking against micros; offline barcode cache beyond the existing per-food row.
