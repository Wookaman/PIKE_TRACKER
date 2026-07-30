import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { View } from 'react-native';
import { getDb } from '../src/db';
import { Meal } from '../src/db/dao';
import { useDbQuery } from '../src/db/useDbQuery';
import { OffFood } from '../src/lib/off';
import { Per100 } from '../src/lib/types';
import { searchOff } from '../src/services/offSearch';
import { usePickStore } from '../src/state/pickStore';
import { BevelButton } from '../src/ui/BevelButton';
import { ListRow } from '../src/ui/ListRow';
import { Screen } from '../src/ui/Screen';
import { SunkenPanel } from '../src/ui/SunkenPanel';
import { Window } from '../src/ui/Window';
import { XPTextInput } from '../src/ui/XPTextInput';
import * as haptics from '../src/ui/haptics';
import { dim, label, sp } from '../src/ui/theme';

interface DraftFood {
  name: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  servingLabel: string;
  servingGrams: string;
}

const EMPTY_DRAFT: DraftFood = {
  name: '',
  kcal: '',
  protein: '',
  carbs: '',
  fat: '',
  servingLabel: '',
  servingGrams: '',
};

function draftPer100(d: DraftFood): Per100 | undefined {
  const kcal = Number(d.kcal);
  const protein = Number(d.protein);
  const carbs = Number(d.carbs);
  const fat = Number(d.fat);
  if (!d.name.trim() || !Number.isFinite(kcal) || kcal < 0) return undefined;
  if ([protein, carbs, fat].some((n) => !Number.isFinite(n) || n < 0)) return undefined;
  return { kcal, protein, carbs, fat };
}

export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <Screen>
      <Window title="CRASH">
        <Text style={dim}>{String(error?.stack ?? error)}</Text>
      </Window>
    </Screen>
  );
}

export default function FoodSearchScreen() {
  const router = useRouter();
  const { meal, pick } = useLocalSearchParams<{ meal?: Meal; pick?: string }>();
  const picking = pick === '1';
  const onPick = usePickStore((s) => s.onPick);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<DraftFood>(EMPTY_DRAFT);
  const [online, setOnline] = useState<'idle' | 'loading' | 'error' | OffFood[]>('idle');

  const setQuery = (v: string) => {
    setQ(v);
    setOnline('idle');
  };

  const runOnlineSearch = async () => {
    setOnline('loading');
    try {
      setOnline(await searchOff(q.trim()));
    } catch {
      setOnline('error');
    }
  };

  const logOffFood = async (f: OffFood) => {
    const db = getDb();
    const id = await db.foods.insert({
      name: f.name,
      brand: f.brand,
      barcode: f.barcode,
      source: 'off',
      per100: f.per100,
      micros: f.micros,
    });
    openDetail(id);
  };

  const results = useDbQuery((db) => db.foods.search(q, 30), [q]) ?? [];
  const recipes =
    useDbQuery(
      async (db) => {
        if (picking) return [];
        const needle = q.trim().toLowerCase();
        const all = await db.recipes.list();
        return all.filter((r) => !needle || r.name.toLowerCase().includes(needle)).slice(0, 10);
      },
      [q, picking],
    ) ?? [];
  const per100 = draftPer100(draft);

  const openDetail = (foodId: number) => {
    if (picking) {
      onPick?.(foodId);
      router.back();
      return;
    }
    router.push({
      pathname: '/food-detail',
      params: { foodId: String(foodId), meal: meal ?? 'snacks' },
    });
  };

  const createFood = async () => {
    if (!per100) return;
    const db = getDb();
    const id = await db.foods.insert({ name: draft.name.trim(), source: 'custom', per100 });
    const grams = Number(draft.servingGrams);
    if (draft.servingLabel.trim() && Number.isFinite(grams) && grams > 0) {
      await db.foods.setServings(id, [{ label: draft.servingLabel.trim(), grams }]);
    }
    haptics.success();
    setCreating(false);
    setDraft(EMPTY_DRAFT);
    openDetail(id);
  };

  const set = (key: keyof DraftFood) => (v: string) => setDraft((d) => ({ ...d, [key]: v }));

  return (
    <Screen>
      <Window title={picking ? 'PICK INGREDIENT' : 'FIND FOOD'} onClose={() => router.back()}>
        <XPTextInput autoFocus placeholder="C:\> search foods_" value={q} onChangeText={setQuery} />
      </Window>

      {creating ? (
        <Window title="NEW FOOD" onClose={() => setCreating(false)}>
          <View style={{ gap: sp.s }}>
            <XPTextInput placeholder="Name" value={draft.name} onChangeText={set('name')} />
            <View style={{ flexDirection: 'row', gap: sp.s }}>
              <XPTextInput placeholder="kcal/100g" keyboardType="decimal-pad" value={draft.kcal} onChangeText={set('kcal')} style={{ flex: 1 }} />
              <XPTextInput placeholder="P/100g" keyboardType="decimal-pad" value={draft.protein} onChangeText={set('protein')} style={{ flex: 1 }} />
            </View>
            <View style={{ flexDirection: 'row', gap: sp.s }}>
              <XPTextInput placeholder="C/100g" keyboardType="decimal-pad" value={draft.carbs} onChangeText={set('carbs')} style={{ flex: 1 }} />
              <XPTextInput placeholder="F/100g" keyboardType="decimal-pad" value={draft.fat} onChangeText={set('fat')} style={{ flex: 1 }} />
            </View>
            <Text style={dim}>OPTIONAL SERVING</Text>
            <View style={{ flexDirection: 'row', gap: sp.s }}>
              <XPTextInput placeholder="Label (1 bar)" value={draft.servingLabel} onChangeText={set('servingLabel')} style={{ flex: 2 }} />
              <XPTextInput placeholder="grams" keyboardType="decimal-pad" value={draft.servingGrams} onChangeText={set('servingGrams')} style={{ flex: 1 }} />
            </View>
            <BevelButton title="SAVE FOOD" disabled={!per100} onPress={createFood} />
          </View>
        </Window>
      ) : (
        <View style={{ flexDirection: 'row', gap: sp.s }}>
          <BevelButton title="+ CREATE FOOD" small onPress={() => setCreating(true)} style={{ flex: 1 }} />
          {!picking ? (
            <BevelButton
              title="SCAN"
              small
              onPress={() => router.push({ pathname: '/barcode-scan', params: { meal: meal ?? 'snacks' } })}
              style={{ flex: 1 }}
            />
          ) : null}
        </View>
      )}

      {recipes.length > 0 ? (
        <Window title="MY RECIPES">
          <SunkenPanel>
            {recipes.map((r) => (
              <ListRow
                key={r.id}
                title={r.name}
                subtitle={`makes ${r.servings}`}
                right={<Text style={[label, { fontSize: 10, color: '#55555c' }]}>RECIPE</Text>}
                onPress={() =>
                  router.push({
                    pathname: '/recipe-log',
                    params: { id: String(r.id), meal: meal ?? 'snacks' },
                  })
                }
              />
            ))}
          </SunkenPanel>
        </Window>
      ) : null}

      <Window title={`FOODS (${results.length})`}>
        {results.length > 0 ? (
          <SunkenPanel>
            {results.map((f) => (
              <ListRow
                key={f.id}
                title={f.brand ? `${f.name} — ${f.brand}` : f.name}
                subtitle={`${Math.round(f.per100.kcal)} kcal / 100 g`}
                right={<Text style={[label, { fontSize: 10, color: '#55555c' }]}>{f.source === 'custom' ? 'MINE' : f.source === 'off' ? 'WEB' : ''}</Text>}
                onPress={() => openDetail(f.id)}
              />
            ))}
          </SunkenPanel>
        ) : (
          <Text style={dim}>NO MATCHES — CREATE IT ABOVE</Text>
        )}
      </Window>

      {q.trim().length > 1 ? (
        online === 'idle' ? (
          <BevelButton title="SEARCH ONLINE" small onPress={runOnlineSearch} />
        ) : online === 'loading' ? (
          <Window title="ONLINE">
            <Text style={dim}>DIALING OPEN FOOD FACTS…</Text>
          </Window>
        ) : online === 'error' ? (
          <Window title="ONLINE">
            <Text style={dim}>ONLINE SEARCH UNAVAILABLE</Text>
            <BevelButton title="RETRY" small onPress={runOnlineSearch} style={{ marginTop: sp.s }} />
          </Window>
        ) : (
          <Window title={`ONLINE (${online.length})`}>
            {online.length > 0 ? (
              <SunkenPanel>
                {online.map((f, i) => (
                  <ListRow
                    key={`${f.barcode ?? f.name}-${i}`}
                    title={f.brand ? `${f.name} — ${f.brand}` : f.name}
                    subtitle={`${Math.round(f.per100.kcal)} kcal / 100 g`}
                    right={<Text style={[label, { fontSize: 10, color: '#55555c' }]}>WEB</Text>}
                    onPress={() => logOffFood(f)}
                  />
                ))}
              </SunkenPanel>
            ) : (
              <Text style={dim}>NOTHING FOUND ONLINE</Text>
            )}
          </Window>
        )
      ) : null}
    </Screen>
  );
}
