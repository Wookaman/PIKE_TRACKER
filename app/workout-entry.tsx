import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getDb } from '../src/db';
import { ExerciseRow, WorkoutEntryRow } from '../src/db/dao';
import { useDbQuery } from '../src/db/useDbQuery';
import { CardioEntry, MUSCLE_LABELS, SetEntry, WorkoutSets } from '../src/lib/types';
import { useAppStore } from '../src/state/appStore';
import { BevelButton } from '../src/ui/BevelButton';
import { Screen } from '../src/ui/Screen';
import { SunkenPanel } from '../src/ui/SunkenPanel';
import { SwipeToDelete } from '../src/ui/SwipeToDelete';
import { Window } from '../src/ui/Window';
import { XPTextInput } from '../src/ui/XPTextInput';
import * as haptics from '../src/ui/haptics';
import { data, dim, label, sp } from '../src/ui/theme';

interface DraftSet {
  reps: string;
  weight: string;
}

/**
 * A number field that only focuses on a real tap, never on a swipe. The input
 * itself is pointer-transparent; a Pressable overlay routes focus. The swipe
 * gesture cancels that press once it activates, so dragging to delete a row no
 * longer pops the keyboard.
 */
function SetNumberField({
  value,
  onChangeText,
  keyboardType,
}: {
  value: string;
  onChangeText: (v: string) => void;
  keyboardType: 'number-pad' | 'decimal-pad';
}) {
  const ref = useRef<TextInput>(null);
  return (
    <View style={{ flex: 1 }}>
      <View pointerEvents="none">
        <XPTextInput ref={ref} value={value} onChangeText={onChangeText} keyboardType={keyboardType} selectTextOnFocus />
      </View>
      <Pressable onPress={() => ref.current?.focus()} style={StyleSheet.absoluteFill} />
    </View>
  );
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
      const lastAttempt = exerciseId ? await db.workouts.lastBefore(exerciseId, dateKey) : undefined;
      return { entry, exercise, lastAttempt };
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
  return (
    <EntryForm exercise={loaded.exercise} entry={loaded.entry} lastAttempt={loaded.lastAttempt} />
  );
}

/** One-line summary of a previous session's sets. */
function summarizeSets(sets: WorkoutSets): string {
  if (!Array.isArray(sets)) return `${sets.durationMin} min`;
  if (sets.length === 0) return '—';
  return sets.map((s) => `${s.reps}×${s.weight}`).join(' · ');
}

function EntryForm({
  exercise,
  entry,
  lastAttempt,
}: {
  exercise: ExerciseRow;
  entry?: WorkoutEntryRow;
  lastAttempt?: { date: string; sets: WorkoutSets };
}) {
  const router = useRouter();
  const dateKey = useAppStore((s) => s.dateKey);
  const bump = useAppStore((s) => s.bump);
  const isCardio = exercise.category === 'cardio';
  const weightUnit = useDbQuery(async (db) => (await db.settings.get('weightUnit')) ?? 'kg', []) ?? 'kg';

  const initialSets: DraftSet[] =
    entry && Array.isArray(entry.sets) && entry.sets.length > 0
      ? (entry.sets as SetEntry[]).map((s) => ({ reps: String(s.reps), weight: String(s.weight) }))
      : [{ reps: '8', weight: '20' }];
  const initialDuration =
    entry && !Array.isArray(entry.sets) ? String((entry.sets as CardioEntry).durationMin) : '30';

  const [sets, setSets] = useState<DraftSet[]>(initialSets);
  const [duration, setDuration] = useState(initialDuration);
  const [unilateral, setUnilateral] = useState(entry?.unilateral ?? false);

  const parsedSets: SetEntry[] = sets
    .map((s) => ({ reps: Number(s.reps), weight: Number(s.weight) }))
    .filter((s) => Number.isFinite(s.reps) && s.reps > 0 && Number.isFinite(s.weight) && s.weight >= 0);
  const parsedDuration = Number(duration);
  const valid = isCardio
    ? Number.isFinite(parsedDuration) && parsedDuration > 0
    : parsedSets.length > 0;

  const totalReps = parsedSets.reduce((sum, s) => sum + s.reps, 0);
  const rawVolume = parsedSets.reduce((sum, s) => sum + s.reps * s.weight, 0);
  // Unilateral: the logged weight is what each side did, so both sides count.
  const volume = unilateral ? rawVolume * 2 : rawVolume;

  const save = async () => {
    if (!valid) return;
    const payload = isCardio ? { durationMin: parsedDuration } : parsedSets;
    if (entry) {
      await getDb().workouts.update(entry.id, { sets: payload, unilateral });
    } else {
      await getDb().workouts.add({ date: dateKey, exerciseId: exercise.id, sets: payload, unilateral });
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp.s }}>
          <Text style={[dim, { flex: 1 }]}>
            {[...exercise.primary, ...exercise.secondary].map((m) => MUSCLE_LABELS[m]).join(' · ')}
          </Text>
          {!isCardio ? (
            <BevelButton
              title="UNILATERAL"
              small
              active={unilateral}
              onPress={() => setUnilateral((u) => !u)}
            />
          ) : null}
        </View>
      </Window>

      {lastAttempt ? (
        <Window title={`LAST TIME · ${lastAttempt.date}`}>
          <Text style={[data, dim]}>{summarizeSets(lastAttempt.sets)}</Text>
        </Window>
      ) : null}

      {isCardio ? (
        <Window title="DURATION (MIN)">
          <XPTextInput keyboardType="decimal-pad" value={duration} onChangeText={setDuration} autoFocus={!entry} selectTextOnFocus />
        </Window>
      ) : (
        <Window title={`SETS (${sets.length})`}>
          <SunkenPanel style={{ marginBottom: sp.s, padding: sp.s, gap: sp.s }}>
            <View style={{ flexDirection: 'row', gap: sp.s, paddingHorizontal: 2 }}>
              <Text style={[label, { flex: 1, fontSize: 10, color: '#8a8a92' }]}>REPS</Text>
              <Text style={[label, { flex: 1, fontSize: 10, color: '#8a8a92' }]}>WEIGHT ({weightUnit.toUpperCase()})</Text>
            </View>
            {sets.map((s, i) => (
              <SwipeToDelete
                key={i}
                disabled={sets.length === 1}
                onDelete={() => setSets((list) => list.filter((_, j) => j !== i))}
              >
                <View style={{ flexDirection: 'row', gap: sp.s, alignItems: 'center' }}>
                  <SetNumberField
                    keyboardType="number-pad"
                    value={s.reps}
                    onChangeText={(v) => setSets((list) => list.map((x, j) => (j === i ? { ...x, reps: v } : x)))}
                  />
                  <SetNumberField
                    keyboardType="decimal-pad"
                    value={s.weight}
                    onChangeText={(v) => setSets((list) => list.map((x, j) => (j === i ? { ...x, weight: v } : x)))}
                  />
                </View>
              </SwipeToDelete>
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
        <Window title="TOTAL" right={unilateral ? <Text style={[label, { fontSize: 10 }]}>×2 UNILATERAL</Text> : undefined}>
          <Text style={data}>
            {totalReps} reps · {volume} volume
          </Text>
        </Window>
      ) : null}

      <BevelButton title={entry ? 'SAVE CHANGES' : `LOG TO ${dateKey}`} disabled={!valid} onPress={save} />
    </Screen>
  );
}
