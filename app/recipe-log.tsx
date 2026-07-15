import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { getDb } from '../src/db';
import { DiaryEntryRow, Meal, RecipeItemRow, RecipeRow } from '../src/db/dao';
import { useDbQuery } from '../src/db/useDbQuery';
import { perServing, recipeTotals } from '../src/lib/nutrition';
import { useAppStore } from '../src/state/appStore';
import { BevelButton } from '../src/ui/BevelButton';
import { Screen } from '../src/ui/Screen';
import { SunkenPanel } from '../src/ui/SunkenPanel';
import { Window } from '../src/ui/Window';
import { XPTextInput } from '../src/ui/XPTextInput';
import * as haptics from '../src/ui/haptics';
import { c, data, dim, label, sp } from '../src/ui/theme';

const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

export default function RecipeLogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; meal?: Meal; entryId?: string }>();
  const dateKey = useAppStore((s) => s.dateKey);

  const loaded = useDbQuery(
    async (db) => {
      const entry = params.entryId
        ? (await db.diary.forDate(dateKey)).find((e) => e.id === Number(params.entryId))
        : undefined;
      const recipeId = entry?.recipeId ?? (params.id ? Number(params.id) : undefined);
      const recipe = recipeId ? await db.recipes.getById(recipeId) : undefined;
      const items = recipeId ? await db.recipes.itemsFor(recipeId) : [];
      return { entry, recipe, items };
    },
    [params.entryId, params.id, dateKey],
  );

  if (!loaded) {
    return (
      <Screen>
        <Window title="RECIPE" onClose={() => router.back()}>
          <Text style={dim}>LOADING…</Text>
        </Window>
      </Screen>
    );
  }
  if (!loaded.recipe) {
    return (
      <Screen>
        <Window title="RECIPE" onClose={() => router.back()}>
          <Text style={dim}>RECIPE NOT FOUND</Text>
        </Window>
      </Screen>
    );
  }
  return (
    <LogForm recipe={loaded.recipe} items={loaded.items} entry={loaded.entry} fallbackMeal={params.meal ?? 'snacks'} />
  );
}

function LogForm({
  recipe,
  items,
  entry,
  fallbackMeal,
}: {
  recipe: RecipeRow;
  items: RecipeItemRow[];
  entry?: DiaryEntryRow;
  fallbackMeal: Meal;
}) {
  const router = useRouter();
  const dateKey = useAppStore((s) => s.dateKey);
  const bump = useAppStore((s) => s.bump);

  const [qtyText, setQtyText] = useState(entry ? String(entry.qty) : '1');
  const [meal, setMeal] = useState<Meal>(entry?.meal ?? fallbackMeal);

  const totals = recipeTotals(items);
  const totalGrams = items.reduce((sum, i) => sum + i.grams, 0);
  const per = perServing(totals, recipe.servings);
  const qty = Number(qtyText);
  const valid = Number.isFinite(qty) && qty > 0;
  const macros = valid
    ? {
        kcal: Math.round(per.kcal * qty),
        protein: Math.round(per.protein * qty * 10) / 10,
        carbs: Math.round(per.carbs * qty * 10) / 10,
        fat: Math.round(per.fat * qty * 10) / 10,
      }
    : { kcal: 0, protein: 0, carbs: 0, fat: 0 };

  const save = async () => {
    if (!valid) return;
    const record = {
      grams: (totalGrams / recipe.servings) * qty,
      qty,
      unitLabel: qty === 1 ? 'serving' : 'servings',
      ...macros,
    };
    if (entry) {
      await getDb().diary.update(entry.id, { ...record, meal });
    } else {
      await getDb().diary.add({ date: dateKey, meal, recipeId: recipe.id, foodId: undefined, ...record });
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
      <Window title={recipe.name.toUpperCase()} onClose={() => router.back()}>
        <Text style={dim}>
          {per.kcal} kcal / serving · makes {recipe.servings}
        </Text>
      </Window>

      <Window title="SERVINGS">
        <XPTextInput
          keyboardType="decimal-pad"
          value={qtyText}
          onChangeText={setQtyText}
          autoFocus={!entry}
          selectTextOnFocus
        />
      </Window>

      <Window title="PREVIEW">
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
