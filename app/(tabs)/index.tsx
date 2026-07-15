import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { DateNav } from '../../src/components/DateNav';
import { MacroSummary } from '../../src/components/MacroSummary';
import { getDb } from '../../src/db';
import { DiaryEntryRow, Meal } from '../../src/db/dao';
import { useDbQuery } from '../../src/db/useDbQuery';
import { sumMacros } from '../../src/lib/nutrition';
import { useAppStore } from '../../src/state/appStore';
import { BevelButton } from '../../src/ui/BevelButton';
import { ListRow } from '../../src/ui/ListRow';
import { Screen } from '../../src/ui/Screen';
import { SunkenPanel } from '../../src/ui/SunkenPanel';
import { Window } from '../../src/ui/Window';
import { confirmDelete } from '../../src/ui/confirm';
import * as haptics from '../../src/ui/haptics';
import { data, dim, sp } from '../../src/ui/theme';

const MEALS: { id: Meal; title: string }[] = [
  { id: 'breakfast', title: 'BREAKFAST' },
  { id: 'lunch', title: 'LUNCH' },
  { id: 'dinner', title: 'DINNER' },
  { id: 'snacks', title: 'SNACKS' },
];

function MealWindow({ meal, entries }: { meal: { id: Meal; title: string }; entries: DiaryEntryRow[] }) {
  const router = useRouter();
  const bump = useAppStore((s) => s.bump);
  const subtotal = Math.round(entries.reduce((sum, e) => sum + e.kcal, 0));

  return (
    <Window title={meal.title} right={<Text style={data}>{subtotal} kcal</Text>}>
      {entries.length > 0 ? (
        <SunkenPanel style={{ marginBottom: sp.s }}>
          {entries.map((e) => (
            <ListRow
              key={e.id}
              title={e.name}
              subtitle={`${e.qty} ${e.unitLabel} · ${Math.round(e.kcal)} kcal`}
              right={<Text style={[data, dim]}>P{Math.round(e.protein)}</Text>}
              onPress={() =>
                router.push({
                  pathname: e.recipeId ? '/recipe-log' : '/food-detail',
                  params: { entryId: String(e.id) },
                })
              }
              onLongPress={() =>
                confirmDelete(`Delete ${e.name}?`, () => {
                  getDb()
                    .diary.remove(e.id)
                    .then(() => {
                      haptics.warn();
                      bump();
                    });
                })
              }
            />
          ))}
        </SunkenPanel>
      ) : (
        <Text style={[dim, { marginBottom: sp.s }]}>NOTHING LOGGED</Text>
      )}
      <BevelButton
        title="+ ADD FOOD"
        small
        onPress={() => router.push({ pathname: '/food-search', params: { meal: meal.id } })}
      />
    </Window>
  );
}

export default function DiaryScreen() {
  const dateKey = useAppStore((s) => s.dateKey);
  const tick = useAppStore((s) => s.tick);

  const entries = useDbQuery((db) => db.diary.forDate(dateKey), [dateKey, tick]) ?? [];
  const kcalGoal = useDbQuery((db) => db.settings.getNum('kcalGoal', 2200), [tick]) ?? 2200;
  const totals = useMemo(() => sumMacros(entries), [entries]);

  return (
    <Screen>
      <DateNav />
      <MacroSummary totals={totals} kcalGoal={kcalGoal} />
      <View style={{ gap: sp.m }}>
        {MEALS.map((m) => (
          <MealWindow key={m.id} meal={m} entries={entries.filter((e) => e.meal === m.id)} />
        ))}
      </View>
    </Screen>
  );
}
