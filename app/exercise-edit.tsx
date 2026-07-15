import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { getDb } from '../src/db';
import { ExerciseCategory } from '../src/db/dao';
import { ALL_MUSCLES, MUSCLE_LABELS, MuscleId } from '../src/lib/types';
import { BevelButton } from '../src/ui/BevelButton';
import { ListRow } from '../src/ui/ListRow';
import { Screen } from '../src/ui/Screen';
import { SunkenPanel } from '../src/ui/SunkenPanel';
import { Window } from '../src/ui/Window';
import { XPTextInput } from '../src/ui/XPTextInput';
import * as haptics from '../src/ui/haptics';
import { c, data, sp } from '../src/ui/theme';

function MusclePicker({
  title,
  selected,
  onToggle,
}: {
  title: string;
  selected: MuscleId[];
  onToggle: (m: MuscleId) => void;
}) {
  return (
    <Window title={title}>
      <SunkenPanel>
        {ALL_MUSCLES.map((m) => {
          const on = selected.includes(m);
          return (
            <ListRow
              key={m}
              title={MUSCLE_LABELS[m]}
              right={<Text style={[data, { color: on ? c.white : c.textFaint }]}>{on ? '▣' : '☐'}</Text>}
              onPress={() => onToggle(m)}
            />
          );
        })}
      </SunkenPanel>
    </Window>
  );
}

export default function ExerciseEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string }>();

  const [name, setName] = useState(params.name ?? '');
  const [category, setCategory] = useState<ExerciseCategory>('strength');
  const [primary, setPrimary] = useState<MuscleId[]>([]);
  const [secondary, setSecondary] = useState<MuscleId[]>([]);

  const valid = name.trim().length > 0 && primary.length > 0;

  const toggle =
    (list: MuscleId[], setList: (v: MuscleId[]) => void, other: MuscleId[], setOther: (v: MuscleId[]) => void) =>
    (m: MuscleId) => {
      if (list.includes(m)) {
        setList(list.filter((x) => x !== m));
      } else {
        setList([...list, m]);
        // A muscle is either primary or secondary, never both.
        if (other.includes(m)) setOther(other.filter((x) => x !== m));
      }
    };

  const save = async () => {
    if (!valid) return;
    const id = await getDb().exercises.insertCustom({
      name: name.trim(),
      category,
      primary,
      secondary,
    });
    haptics.success();
    router.replace({ pathname: '/workout-entry', params: { exerciseId: String(id) } });
  };

  return (
    <Screen>
      <Window title="NEW EXERCISE" onClose={() => router.back()}>
        <View style={{ gap: sp.s }}>
          <XPTextInput placeholder="Exercise name" value={name} onChangeText={setName} />
          <View style={{ flexDirection: 'row', gap: sp.s }}>
            <BevelButton title="STRENGTH" small active={category === 'strength'} onPress={() => setCategory('strength')} style={{ flex: 1 }} />
            <BevelButton title="CARDIO" small active={category === 'cardio'} onPress={() => setCategory('cardio')} style={{ flex: 1 }} />
          </View>
        </View>
      </Window>

      <MusclePicker
        title="PRIMARY MUSCLES"
        selected={primary}
        onToggle={toggle(primary, setPrimary, secondary, setSecondary)}
      />
      <MusclePicker
        title="SECONDARY MUSCLES"
        selected={secondary}
        onToggle={toggle(secondary, setSecondary, primary, setPrimary)}
      />

      <BevelButton title="SAVE & LOG IT" disabled={!valid} onPress={save} />
    </Screen>
  );
}
