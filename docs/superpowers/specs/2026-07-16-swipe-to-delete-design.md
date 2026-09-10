# Swipe-to-Delete — Design Spec

Date: 2026-07-16
Status: Approved

## Purpose

Delete a logged item by swiping it left. A `DEL` button slides in from the right edge, exactly as tall as the row being deleted. Tapping it removes the item immediately.

Replaces the current long-press-plus-confirm-dialog delete, which is undiscoverable.

## Scope

| Surface | File | Row |
|---|---|---|
| Diary | `app/(tabs)/index.tsx` | Food and recipe entries under each meal |
| Workouts | `app/(tabs)/workouts.tsx` | Exercise entries in the session log |
| Workout entry modal | `app/workout-entry.tsx` | Individual set rows (replaces the ✕ button) |

Out of scope: recipes list and recipe ingredients (`app/(tabs)/recipes.tsx`, `app/recipe-edit.tsx`) keep long-press + confirm.

## Mechanism

`ReanimatedSwipeable` from `react-native-gesture-handler` (3.0.2), with `react-native-reanimated` (4.5.1). Both already present as transitive dependencies of expo-router; promoted to direct dependencies via `npx expo install` so the versions are pinned intentionally.

Its right-action container is absolutely positioned to the row's measured height, which satisfies the "exact height as the object" requirement for any row — a two-line food entry or a compact set row — without measuring anything by hand.

`GestureHandlerRootView` wraps the app at `app/_layout.tsx`.

## Component

`src/ui/SwipeToDelete.tsx` — owns the gesture; wrapped rows stay unaware of it. `ListRow` is unchanged.

```ts
interface SwipeToDeleteProps {
  onDelete: () => void;
  children: ReactNode;
  /** Disables the gesture (e.g. the last remaining set). */
  disabled?: boolean;
}
```

## Behavior

- Swipe left past ~40% of the button width → DEL latches open. Short swipes spring closed.
- Tap DEL → `onDelete()` fires immediately. No confirmation dialog: the swipe is deliberate and DEL is a second, explicit tap.
- Only one row stays open at a time is NOT enforced — closing happens on swipe-back or on the row being removed. (YAGNI; revisit if it feels wrong on device.)
- `disabled` rows do not swipe at all.

## Visual

Monochrome, blacks and greys — no colour, consistent with the rest of the UI.

- Width 76, full row height, raised bevel: `c.raisedHi` (`#26262b`) fill, light top/left edge, dark bottom/right.
- Label `DEL` in the existing `label` type (12px, bold, 2px letter-spacing, uppercase), `c.text`.
- Pressed: bevel inverts to sunken, label goes `c.white`, content nudges 1px down-right — identical to `BevelButton`.

## Haptics

- Light tap (`haptics.tap`) when DEL latches open.
- Medium thud (`haptics.thud`) on delete.

## Data flow

Unchanged. Each screen's `onDelete` calls the DAO it already calls (`diary.remove`, `workouts.remove`, or local `setSets` state for set rows), then `bump()` to refresh, exactly as the long-press path did.

## Error handling

DAO deletes are already awaited promises; a rejection logs and leaves the row in place — the list re-reads from SQLite on the next `bump()`, so the UI cannot drift from the database.

## Testing

No new pure logic — this is gesture and render. Verification:
- Existing 63 jest tests stay green; `tsc --noEmit` clean.
- Browser preview: drag a diary row left, confirm DEL renders at the row's exact height, tap it, confirm the row disappears and day totals recalculate. Repeat for a workout row and a set row.

## Risk / fallback

Reanimated 4 is a transitive dependency, not a deliberate pick. If it misbehaves on web, fall back to a hand-rolled `PanResponder` + `Animated` implementation inside the same `SwipeToDelete` component — identical visual result and props, no new dependencies. Consumers would not change.
