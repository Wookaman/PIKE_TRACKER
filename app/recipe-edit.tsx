import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { getDb } from '../src/db';
import { RecipeRow } from '../src/db/dao';
import { useDbQuery } from '../src/db/useDbQuery';
import { perServing, recipeTotals } from '../src/lib/nutrition';
import { Per100 } from '../src/lib/types';
import { useAppStore } from '../src/state/appStore';
import { usePickStore } from '../src/state/pickStore';
import { BevelButton } from '../src/ui/BevelButton';
import { ListRow } from '../src/ui/ListRow';
import { Screen } from '../src/ui/Screen';
import { SunkenPanel } from '../src/ui/SunkenPanel';
import { Window } from '../src/ui/Window';
import { XPTextInput } from '../src/ui/XPTextInput';
import { confirmDelete } from '../src/ui/confirm';
import * as haptics from '../src/ui/haptics';
import { data, dim, sp } from '../src/ui/theme';

interface DraftItem {
  foodId: number;
  name: string;
  per100: Per100;
  gramsText: string;
}

export default function RecipeEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const recipeId = id ? Number(id) : undefined;

  const loaded = useDbQuery(
    async (db) => {
      if (!recipeId) return { items: [] as DraftItem[] };
      const recipe = await db.recipes.getById(recipeId);
      const items = (await db.recipes.itemsFor(recipeId)).map((i) => ({
        foodId: i.foodId,
        name: i.foodName,
        per100: i.per100,
        gramsText: String(i.grams),
      }));
      return { recipe, items };
    },
    [recipeId],
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
  return <EditForm recipeId={recipeId} existing={loaded.recipe} initialItems={loaded.items} />;
}

function EditForm({
  recipeId,
  existing,
  initialItems,
}: {
  recipeId?: number;
  existing?: RecipeRow;
  initialItems: DraftItem[];
}) {
  const router = useRouter();
  const bump = useAppStore((s) => s.bump);
  const setOnPick = usePickStore((s) => s.setOnPick);

  const [name, setName] = useState(existing?.name ?? '');
  const [servingsText, setServingsText] = useState(String(existing?.servings ?? 1));
  const [items, setItems] = useState<DraftItem[]>(initialItems);

  const servings = Number(servingsText);
  const parsedItems = items
    .map((i) => ({ ...i, grams: Number(i.gramsText) }))
    .filter((i) => Number.isFinite(i.grams) && i.grams > 0);
  const totals = recipeTotals(parsedItems.map((i) => ({ per100: i.per100, grams: i.grams })));
  const per = perServing(totals, Number.isFinite(servings) && servings >= 1 ? servings : 1);
  const valid = name.trim().length > 0 && parsedItems.length > 0 && Number.isFinite(servings) && servings >= 1;

  const addIngredient = () => {
    setOnPick((foodId) => {
      getDb()
        .foods.getById(foodId)
        .then((food) => {
          if (food) {
            setItems((list) => [
              ...list,
              { foodId, name: food.name, per100: food.per100, gramsText: '100' },
            ]);
          }
        });
      setOnPick(undefined);
    });
    router.push({ pathname: '/food-search', params: { pick: '1' } });
  };

  const save = async () => {
    if (!valid) return;
    const db = getDb();
    const record = { name: name.trim(), servings };
    let savedId = recipeId;
    if (recipeId) {
      await db.recipes.update(recipeId, record);
    } else {
      savedId = await db.recipes.insert(record);
    }
    await db.recipes.setItems(savedId!, parsedItems.map((i) => ({ foodId: i.foodId, grams: i.grams })));
    haptics.success();
    bump();
    router.back();
  };

  const removeRecipe = () => {
    if (!recipeId) return;
    confirmDelete(`Delete recipe ${name}?`, () => {
      getDb()
        .recipes.softDelete(recipeId)
        .then(() => {
          haptics.warn();
          bump();
          router.back();
        });
    });
  };

  return (
    <Screen>
      <Window title={recipeId ? 'EDIT RECIPE' : 'NEW RECIPE'} onClose={() => router.back()}>
        <View style={{ gap: sp.s }}>
          <XPTextInput placeholder="Recipe name" value={name} onChangeText={setName} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp.s }}>
            <Text style={dim}>MAKES</Text>
            <XPTextInput
              keyboardType="decimal-pad"
              value={servingsText}
              onChangeText={setServingsText}
              style={{ width: 70 }}
            />
            <Text style={dim}>SERVINGS</Text>
          </View>
        </View>
      </Window>

      <Window title={`INGREDIENTS (${items.length})`}>
        {items.length > 0 ? (
          <SunkenPanel style={{ marginBottom: sp.s }}>
            {items.map((item, index) => (
              <View
                key={`${item.foodId}-${index}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: sp.s, paddingRight: sp.s }}
              >
                <View style={{ flex: 1 }}>
                  <ListRow
                    title={item.name}
                    subtitle={`${Math.round(item.per100.kcal)} kcal / 100 g`}
                    onLongPress={() =>
                      confirmDelete(`Remove ${item.name}?`, () =>
                        setItems((list) => list.filter((_, i) => i !== index)),
                      )
                    }
                  />
                </View>
                <XPTextInput
                  keyboardType="decimal-pad"
                  value={item.gramsText}
                  onChangeText={(v) =>
                    setItems((list) => list.map((it, i) => (i === index ? { ...it, gramsText: v } : it)))
                  }
                  style={{ width: 64 }}
                />
                <Text style={dim}>g</Text>
              </View>
            ))}
          </SunkenPanel>
        ) : (
          <Text style={[dim, { marginBottom: sp.s }]}>NO INGREDIENTS YET</Text>
        )}
        <BevelButton title="+ ADD INGREDIENT" small onPress={addIngredient} />
      </Window>

      <Window title="PER SERVING" right={<Text style={data}>{per.kcal} kcal</Text>}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[data, dim]}>P {per.protein}g</Text>
          <Text style={[data, dim]}>C {per.carbs}g</Text>
          <Text style={[data, dim]}>F {per.fat}g</Text>
        </View>
      </Window>

      <BevelButton title="SAVE RECIPE" disabled={!valid} onPress={save} />
      {recipeId ? <BevelButton title="DELETE RECIPE" small onPress={removeRecipe} /> : null}
    </Screen>
  );
}
