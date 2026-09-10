import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useDbQuery } from '../src/db/useDbQuery';
import { sessionE1RM } from '../src/lib/strength';
import { displayWeight } from '../src/lib/units';
import { SetEntry } from '../src/lib/types';
import { useAppStore } from '../src/state/appStore';
import { BevelButton } from '../src/ui/BevelButton';
import { ChartPoint, LineChart } from '../src/ui/LineChart';
import { Screen } from '../src/ui/Screen';
import { Window } from '../src/ui/Window';
import { dim, sp } from '../src/ui/theme';

/** Chart labels use MM-DD to stay compact. */
const shortDate = (d: string) => d.slice(5);

export default function ProgressScreen() {
  const router = useRouter();
  const tick = useAppStore((s) => s.tick);

  const unitRaw =
    useDbQuery(async (db) => (await db.settings.get('weightUnit')) ?? 'kg', [tick]) ?? 'kg';
  const unit = unitRaw.toUpperCase();

  const bodyweight =
    useDbQuery(async (db) => {
      const hist = await db.bodyweight.history();
      // Stored in kg; convert for display.
      return hist.map((h): ChartPoint => ({ label: shortDate(h.date), value: displayWeight(h.weight, unitRaw) }));
    }, [tick, unitRaw]) ?? [];

  const exercises = useDbQuery((db) => db.workouts.loggedExercises(), [tick]) ?? [];

  const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
  const activeId = selectedId ?? exercises[0]?.id;

  const strength =
    useDbQuery(async (db) => {
      if (activeId === undefined) return [];
      const hist = await db.workouts.historyForExercise(activeId);
      // One point per date = the best estimated 1RM that day.
      const perDate = new Map<string, number>();
      for (const h of hist) {
        if (!Array.isArray(h.sets)) continue; // strength only
        const e1rm = sessionE1RM(h.sets as SetEntry[]);
        perDate.set(h.date, Math.max(perDate.get(h.date) ?? 0, e1rm));
      }
      return [...perDate.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]): ChartPoint => ({ label: shortDate(date), value: Math.round(value) }));
    }, [activeId, tick]) ?? [];

  return (
    <Screen>
      <Window title="PROGRESS" onClose={() => router.back()}>
        <Text style={dim}>BODYWEIGHT & STRENGTH OVER TIME</Text>
      </Window>

      <Window title="BODYWEIGHT">
        <LineChart points={bodyweight} yLabel={`WEIGHT (${unit})`} xLabel="DATE" />
      </Window>

      <Window title="STRENGTH (EST. 1RM)">
        {exercises.length === 0 ? (
          <Text style={dim}>LOG A STRENGTH EXERCISE TO SEE PROGRESS</Text>
        ) : (
          <View style={{ gap: sp.s }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: sp.s }}>
                {exercises.map((e) => (
                  <BevelButton
                    key={e.id}
                    title={e.name}
                    small
                    active={e.id === activeId}
                    onPress={() => setSelectedId(e.id)}
                  />
                ))}
              </View>
            </ScrollView>
            <LineChart points={strength} yLabel={`EST 1RM (${unit})`} xLabel="DATE" />
          </View>
        )}
      </Window>
    </Screen>
  );
}
