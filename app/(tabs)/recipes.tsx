import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { useDbQuery } from '../../src/db/useDbQuery';
import { perServing, recipeTotals } from '../../src/lib/nutrition';
import { useAppStore } from '../../src/state/appStore';
import { BevelButton } from '../../src/ui/BevelButton';
import { ListRow } from '../../src/ui/ListRow';
import { Screen } from '../../src/ui/Screen';
import { SunkenPanel } from '../../src/ui/SunkenPanel';
import { Window } from '../../src/ui/Window';
import { data, dim } from '../../src/ui/theme';

export default function RecipesScreen() {
  const router = useRouter();
  const tick = useAppStore((s) => s.tick);

  const recipes =
    useDbQuery(
      async (db) => {
        const list = await db.recipes.list();
        return Promise.all(
          list.map(async (r) => {
            const totals = recipeTotals(await db.recipes.itemsFor(r.id));
            return { ...r, per: perServing(totals, r.servings) };
          }),
        );
      },
      [tick],
    ) ?? [];

  return (
    <Screen>
      <Window title="RECIPES" right={<Text style={data}>{recipes.length}</Text>}>
        {recipes.length > 0 ? (
          <SunkenPanel>
            {recipes.map((r) => (
              <ListRow
                key={r.id}
                title={r.name}
                subtitle={`${r.per.kcal} kcal / serving · makes ${r.servings}`}
                right={<Text style={[data, dim]}>P{Math.round(r.per.protein)}</Text>}
                onPress={() => router.push({ pathname: '/recipe-edit', params: { id: String(r.id) } })}
              />
            ))}
          </SunkenPanel>
        ) : (
          <Text style={dim}>NO RECIPES YET — COOK SOMETHING UP</Text>
        )}
      </Window>
      <BevelButton title="+ NEW RECIPE" onPress={() => router.push('/recipe-edit')} />
    </Screen>
  );
}
