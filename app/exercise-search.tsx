import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { useDbQuery } from '../src/db/useDbQuery';
import { MUSCLE_LABELS } from '../src/lib/types';
import { BevelButton } from '../src/ui/BevelButton';
import { ListRow } from '../src/ui/ListRow';
import { Screen } from '../src/ui/Screen';
import { SunkenPanel } from '../src/ui/SunkenPanel';
import { Window } from '../src/ui/Window';
import { XPTextInput } from '../src/ui/XPTextInput';
import { dim, label } from '../src/ui/theme';

export default function ExerciseSearchScreen() {
  const router = useRouter();
  const { tick } = useLocalSearchParams<{ tick?: string }>();
  const [q, setQ] = useState('');

  const results = useDbQuery((db) => db.exercises.search(q, 40), [q, tick]) ?? [];

  return (
    <Screen>
      <Window title="FIND EXERCISE" onClose={() => router.back()}>
        <XPTextInput autoFocus placeholder="C:\> search exercises_" value={q} onChangeText={setQ} />
      </Window>

      <BevelButton
        title="+ CREATE EXERCISE"
        small
        onPress={() => router.push({ pathname: '/exercise-edit', params: { name: q } })}
      />

      <Window title={`EXERCISES (${results.length})`}>
        {results.length > 0 ? (
          <SunkenPanel>
            {results.map((e) => (
              <ListRow
                key={e.id}
                title={e.name}
                subtitle={e.primary.map((m) => MUSCLE_LABELS[m]).join(', ')}
                right={
                  <Text style={[label, { fontSize: 10, color: '#55555c' }]}>
                    {e.isCustom ? 'MINE' : e.category === 'cardio' ? 'CARDIO' : ''}
                  </Text>
                }
                onPress={() =>
                  router.push({ pathname: '/workout-entry', params: { exerciseId: String(e.id) } })
                }
              />
            ))}
          </SunkenPanel>
        ) : (
          <Text style={dim}>NO MATCHES — CREATE IT ABOVE</Text>
        )}
      </Window>
    </Screen>
  );
}
