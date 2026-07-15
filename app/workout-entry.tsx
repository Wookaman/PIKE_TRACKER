import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { getDb } from '../src/db';
import { ExerciseRow, WorkoutEntryRow } from '../src/db/dao';
import { useDbQuery } from '../src/db/useDbQuery';
import { CardioEntry, MUSCLE_LABELS, SetEntry } from '../src/lib/types';
import { useAppStore } from '../src/state/appStore';
import { BevelButton } from '../src/ui/BevelButton';
import { Screen } from '../src/ui/Screen';
import { SunkenPanel } from '../src/ui/SunkenPanel';
import { Window } from '../src/ui/Window';
import { XPTextInput } from '../src/ui/XPTextInput';
import * as haptics from '../src/ui/haptics';
import { data, dim, label, sp } from '../src/ui/theme';

interface DraftSet {
  reps: string;
  weight: string;
}

export default function WorkoutEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ exerciseId?: string; entryId?: string }>();
  const dateKey = useAppStore((s) => s.dateKey);

  const loaded = useDbQuery(
    async (db) => {
      const entry = params.entryId
        ? (await db.workouts.forDate(dateKey)).find((e) => e.id === Number(params.entryId))
        : undefined;
      const exerciseId = entry?.exerciseId ?? (params.exerciseId ? Number(params.exerciseId) : undefined);
      const exercise = exerciseId ? await db.exercises.getById(exerciseId) : undefined;
      return { entry, exercise };
    },
    [params.entryId, params.exerciseId, dateKey],
  );

  if (!loaded) {
    return (
      <Screen>
        <Window title="EXERCISE" onClose={() => router.back()}>
          <Text style={dim}>LOADING…</Text>
        </Window>
      </Screen>
    );
  }
  if (!loaded.exercise) {
    return (
      <Screen>
        <Window title="EXERCISE" onClose={() => router.back()}>
          <Text style={dim}>EXERCISE NOT FOUND</Text>
        </Window>
      </Screen>
    );
  }
  return <EntryForm exercise={loaded.exercise} entry={loaded.entry} />;
}

function EntryForm({ exercise, entry }: { exercise: ExerciseRow; entry?: WorkoutEntryRow }) {
  const router = useRouter();
  const dateKey = useAppStore((s) => s.dateKey);
  const bump = useAppStore((s) => s.bump);
  const isCardio = exercise.category === 'cardio';

  const initialSets: DraftSet[] =
    entry && Array.isArray(entry.sets) && entry.sets.length > 0
      ? (entry.sets as SetEntry[]).map((s) => ({ reps: String(s.reps), weight: String(s.weight) }))
      : [{ reps: '8', weight: '20' }];
  const initialDuration =
    entry && !Array.isArray(entry.sets) ? String((entry.sets as CardioEntry).durationMin) : '30';

  const [sets, setSets] = useState<DraftSet[]>(initialSets);
  const [duration, setDuration] = useState(initialDuration);

  const parsedSets: SetEntry[] = sets
    .map((s) => ({ reps: Number(s.reps), weight: Number(s.weight) }))
    .filter((s) => Number.isFinite(s.reps) && s.reps > 0 && Number.isFinite(s.weight) && s.weight >= 0);
  const parsedDuration = Number(duration);
  const valid = isCardio
    ? Number.isFinite(parsedDuration) && parsedDuration > 0
    : parsedSets.length > 0;

  const save = async () => {
    if (!valid) return;
    const payload = isCardio ? { durationMin: parsedDuration } : parsedSets;
    if (entry) {
      await getDb().workouts.update(entry.id, { sets: payload });
    } else {
      await getDb().workouts.add({ date: dateKey, exerciseId: exercise.id, sets: payload });
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
      <Window title={exercise.name.toUpperCase()} onClose={() => router.back()}>
        <Text style={dim}>
          {[...exercise.primary, ...exercise.secondary].map((m) => MUSCLE_LABELS[m]).join(' · ')}
        </Text>
      </Window>

      {isCardio ? (
        <Window title="DURATION (MIN)">
          <XPTextInput keyboardType="decimal-pad" value={duration} onChangeText={setDuration} autoFocus={!entry} selectTextOnFocus />
        </Window>
      ) : (
        <Window title={`SETS (${sets.length})`}>
          <SunkenPanel style={{ marginBottom: sp.s, padding: sp.s, gap: sp.s }}>
            <View style={{ flexDirection: 'row', gap: sp.s, paddingHorizontal: 2 }}>
              <Text style={[label, { flex: 1, fontSize: 10, color: '#8a8a92' }]}>REPS</Text>
              <Text style={[label, { flex: 1, fontSize: 10, color: '#8a8a92' }]}>WEIGHT</Text>
              <View style={{ width: 34 }} />
            </View>
            {sets.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: sp.s, alignItems: 'center' }}>
                <XPTextInput
                  keyboardType="number-pad"
                  value={s.reps}
                  onChangeText={(v) => setSets((list) => list.map((x, j) => (j === i ? { ...x, reps: v } : x)))}
                  style={{ flex: 1 }}
                />
                <XPTextInput
                  keyboardType="decimal-pad"
                  value={s.weight}
                  onChangeText={(v) => setSets((list) => list.map((x, j) => (j === i ? { ...x, weight: v } : x)))}
                  style={{ flex: 1 }}
                />
                <BevelButton
                  small
                  title="✕"
                  disabled={sets.length === 1}
                  onPress={() => setSets((list) => list.filter((_, j) => j !== i))}
                  style={{ width: 34 }}
                />
              </View>
            ))}
          </SunkenPanel>
          <BevelButton
            title="+ ADD SET"
            small
            onPress={() => setSets((list) => [...list, { ...list[list.length - 1] }])}
          />
        </Window>
      )}

      {!isCardio && parsedSets.length > 0 ? (
        <Window title="TOTAL">
          <Text style={data}>
            {parsedSets.reduce((sum, s) => sum + s.reps, 0)} reps ·{' '}
            {parsedSets.reduce((sum, s) => sum + s.reps * s.weight, 0)} volume
          </Text>
        </Window>
      ) : null}

      <BevelButton title={entry ? 'SAVE CHANGES' : `LOG TO ${dateKey}`} disabled={!valid} onPress={save} />
    </Screen>
  );
}
