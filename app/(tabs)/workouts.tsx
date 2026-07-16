import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { DateNav } from '../../src/components/DateNav';
import { getDb } from '../../src/db';
import { WorkoutEntryRow } from '../../src/db/dao';
import { useDbQuery } from '../../src/db/useDbQuery';
import { MuscleFigure } from '../../src/figure/MuscleFigure';
import { aggregateMuscles } from '../../src/lib/muscles';
import { SetEntry } from '../../src/lib/types';
import { useAppStore } from '../../src/state/appStore';
import { BevelButton } from '../../src/ui/BevelButton';
import { ListRow } from '../../src/ui/ListRow';
import { Screen } from '../../src/ui/Screen';
import { SunkenPanel } from '../../src/ui/SunkenPanel';
import { SwipeToDelete } from '../../src/ui/SwipeToDelete';
import { Window } from '../../src/ui/Window';
import { data, dim, sp } from '../../src/ui/theme';

function setsSummary(e: WorkoutEntryRow): string {
  if (!Array.isArray(e.sets)) return `${e.sets.durationMin} min`;
  const sets = e.sets as SetEntry[];
  if (sets.length === 0) return 'no sets';
  const top = Math.max(...sets.map((s) => s.weight));
  return `${sets.length}×${sets[0].reps} @ ${top}`;
}

export default function WorkoutsScreen() {
  const router = useRouter();
  const dateKey = useAppStore((s) => s.dateKey);
  const tick = useAppStore((s) => s.tick);
  const bump = useAppStore((s) => s.bump);

  const entries = useDbQuery((db) => db.workouts.forDate(dateKey), [dateKey, tick]) ?? [];

  return (
    <Screen>
      <DateNav />

      <Window title="MUSCLES WORKED">
        <MuscleFigure highlights={aggregateMuscles(entries)} />
      </Window>

      <Window title="SESSION LOG" right={<Text style={data}>{entries.length}</Text>}>
        {entries.length > 0 ? (
          <SunkenPanel style={{ marginBottom: sp.s }}>
            {entries.map((e) => (
              <SwipeToDelete
                key={e.id}
                onDelete={() => {
                  getDb().workouts.remove(e.id).then(bump);
                }}
              >
                <ListRow
                  title={e.name}
                  subtitle={setsSummary(e)}
                  right={<Text style={[data, dim]}>{e.category === 'cardio' ? 'CARDIO' : ''}</Text>}
                  onPress={() =>
                    router.push({ pathname: '/workout-entry', params: { entryId: String(e.id) } })
                  }
                />
              </SwipeToDelete>
            ))}
          </SunkenPanel>
        ) : (
          <Text style={[dim, { marginBottom: sp.s }]}>REST DAY (SO FAR)</Text>
        )}
        <BevelButton title="+ ADD EXERCISE" small onPress={() => router.push('/exercise-search')} />
      </Window>
    </Screen>
  );
}
