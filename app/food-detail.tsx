import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { getDb } from '../src/db';
import { DiaryEntryRow, FoodRow, Meal } from '../src/db/dao';
import { useDbQuery } from '../src/db/useDbQuery';
import { macrosForGrams } from '../src/lib/nutrition';
import { Serving, Unit } from '../src/lib/types';
import { gramsFor, unitLabel } from '../src/lib/units';
import { useAppStore } from '../src/state/appStore';
import { BevelButton } from '../src/ui/BevelButton';
import { Screen } from '../src/ui/Screen';
import { SunkenPanel } from '../src/ui/SunkenPanel';
import { Window } from '../src/ui/Window';
import { XPTextInput } from '../src/ui/XPTextInput';
import * as haptics from '../src/ui/haptics';
import { c, data, dim, label, sp } from '../src/ui/theme';

const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

interface LoadedDetail {
  food?: FoodRow;
  servings: Serving[];
  entry?: DiaryEntryRow;
}

export default function FoodDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ foodId?: string; meal?: Meal; entryId?: string }>();
  const dateKey = useAppStore((s) => s.dateKey);

  const loaded = useDbQuery<LoadedDetail>(
    async (db) => {
      const entry = params.entryId
        ? (await db.diary.forDate(dateKey)).find((e) => e.id === Number(params.entryId))
        : undefined;
      const foodId = entry?.foodId ?? (params.foodId ? Number(params.foodId) : undefined);
      const food = foodId ? await db.foods.getById(foodId) : undefined;
      const servings = foodId ? await db.foods.servingsFor(foodId) : [];
      return { food, servings, entry };
    },
    [params.entryId, params.foodId, dateKey],
  );

  if (!loaded) {
    return (
      <Screen>
        <Window title="FOOD" onClose={() => router.back()}>
          <Text style={dim}>LOADING…</Text>
        </Window>
      </Screen>
    );
  }
  if (!loaded.food) {
    return (
      <Screen>
        <Window title="FOOD" onClose={() => router.back()}>
          <Text style={dim}>FOOD NOT FOUND</Text>
        </Window>
      </Screen>
    );
  }
  return (
    <DetailForm
      food={loaded.food}
      servings={loaded.servings}
      entry={loaded.entry}
      fallbackMeal={params.meal ?? 'snacks'}
    />
  );
}

function DetailForm({
  food,
  servings,
  entry,
  fallbackMeal,
}: {
  food: FoodRow;
  servings: Serving[];
  entry?: DiaryEntryRow;
  fallbackMeal: Meal;
}) {
  const router = useRouter();
  const dateKey = useAppStore((s) => s.dateKey);
  const bump = useAppStore((s) => s.bump);

  const units: Unit[] = [
    { kind: 'g' },
    { kind: 'oz' },
    ...servings.map((s) => ({ kind: 'serving', serving: s }) as Unit),
  ];

  const initialUnitIndex = entry
    ? Math.max(0, units.findIndex((u) => unitLabel(u) === entry.unitLabel))
    : servings.length > 0
      ? 2
      : 0;
  const [unitIndex, setUnitIndex] = useState(initialUnitIndex);
  const [qtyText, setQtyText] = useState(entry ? String(entry.qty) : servings.length > 0 ? '1' : '100');
  const [meal, setMeal] = useState<Meal>(entry?.meal ?? fallbackMeal);

  const unit = units[Math.min(unitIndex, units.length - 1)];
  const qty = Number(qtyText);
  const valid = Number.isFinite(qty) && qty > 0;
  const grams = valid ? gramsFor(qty, unit) : 0;
  const macros = macrosForGrams(food.per100, grams);

  const save = async () => {
    if (!valid) return;
    const record = {
      grams,
      qty,
      unitLabel: unitLabel(unit),
      kcal: macros.kcal,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
    };
    if (entry) {
      await getDb().diary.update(entry.id, { ...record, meal });
    } else {
      await getDb().diary.add({ date: dateKey, meal, foodId: food.id, recipeId: undefined, ...record });
    }
    haptics.success();
    bump();
    if (entry) {
      router.back();
    } else {
      router.dismissAll();
    }
  };

  return (
    <Screen>
      <Window title={food.name.toUpperCase()} onClose={() => router.back()}>
        <Text style={dim}>
          {Math.round(food.per100.kcal)} kcal / 100 g · P {food.per100.protein} · C {food.per100.carbs} · F {food.per100.fat}
        </Text>
      </Window>

      <Window title="AMOUNT">
        <View style={{ flexDirection: 'row', gap: sp.s, marginBottom: sp.s }}>
          <XPTextInput
            keyboardType="decimal-pad"
            value={qtyText}
            onChangeText={setQtyText}
            style={{ flex: 1 }}
            autoFocus={!entry}
            selectTextOnFocus
          />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: sp.s }}>
          {units.map((u, i) => (
            <BevelButton
              key={unitLabel(u) + i}
              title={unitLabel(u)}
              small
              active={i === unitIndex}
              onPress={() => setUnitIndex(i)}
            />
          ))}
        </View>
      </Window>

      <Window title="PREVIEW" right={<Text style={data}>{grams ? `${Math.round(grams)} g` : '—'}</Text>}>
        <SunkenPanel style={{ padding: sp.m, alignItems: 'center' }}>
          <Text style={[data, { fontSize: 28, color: c.white }]}>{macros.kcal}</Text>
          <Text style={[label, { color: c.textDim, fontSize: 10 }]}>KCAL</Text>
          <View style={{ flexDirection: 'row', gap: sp.l, marginTop: sp.s }}>
            <Text style={[data, dim]}>P {macros.protein}g</Text>
            <Text style={[data, dim]}>C {macros.carbs}g</Text>
            <Text style={[data, dim]}>F {macros.fat}g</Text>
          </View>
        </SunkenPanel>
      </Window>

      <Window title="MEAL">
        <View style={{ flexDirection: 'row', gap: sp.s }}>
          {MEALS.map((m) => (
            <BevelButton
              key={m}
              title={m.slice(0, 5).toUpperCase()}
              small
              active={meal === m}
              onPress={() => setMeal(m)}
              style={{ flex: 1 }}
            />
          ))}
        </View>
      </Window>

      <BevelButton title={entry ? 'SAVE CHANGES' : `LOG TO ${dateKey}`} disabled={!valid} onPress={save} />
    </Screen>
  );
}
