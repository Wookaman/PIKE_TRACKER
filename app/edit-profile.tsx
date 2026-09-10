import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { getDb } from '../src/db';
import { useDbQuery } from '../src/db/useDbQuery';
import { Activity, ACTIVITY_LABELS, Sex } from '../src/lib/goals';
import { displayWeight, toCanonicalKg } from '../src/lib/units';
import { useAppStore } from '../src/state/appStore';
import { loadProfile, ProfileStats, recomputeAndSaveGoals } from '../src/state/goalActions';
import { BevelButton } from '../src/ui/BevelButton';
import { Screen } from '../src/ui/Screen';
import { Window } from '../src/ui/Window';
import { XPTextInput } from '../src/ui/XPTextInput';
import * as haptics from '../src/ui/haptics';
import { dim, sp } from '../src/ui/theme';

const ACTIVITIES: Activity[] = ['sedentary', 'light', 'moderate', 'active', 'very_active'];

export default function EditProfileScreen() {
  const router = useRouter();
  const loaded = useDbQuery(
    async (db) => ({
      profile: await loadProfile(),
      unit: (await db.settings.get('weightUnit')) ?? 'kg',
    }),
    [],
  );

  if (!loaded) {
    return (
      <Screen>
        <Window title="EDIT PROFILE" onClose={() => router.back()}>
          <Text style={dim}>LOADING…</Text>
        </Window>
      </Screen>
    );
  }
  return <EditProfileForm profile={loaded.profile} unit={loaded.unit} />;
}

function EditProfileForm({ profile, unit }: { profile: ProfileStats; unit: string }) {
  const router = useRouter();
  const bump = useAppStore((s) => s.bump);

  const [weight, setWeight] = useState(
    profile.complete ? String(displayWeight(profile.weightKg, unit)) : '',
  );
  const [height, setHeight] = useState(profile.complete ? String(profile.heightCm) : '');
  const [age, setAge] = useState(profile.complete ? String(profile.age) : '');
  const [sex, setSex] = useState<Sex>(profile.sex);
  const [activity, setActivity] = useState<Activity | undefined>(profile.activity);

  const w = Number(weight);
  const h = Number(height);
  const a = Number(age);
  const valid = [w, h, a].every((n) => Number.isFinite(n) && n > 0);

  const save = async () => {
    if (!valid) return;
    const weightKg = toCanonicalKg(w, unit);
    const s = getDb().settings;
    await s.set('profileWeightKg', String(Math.round(weightKg * 10) / 10));
    await s.set('profileHeightCm', String(h));
    await s.set('profileAge', String(a));
    await s.set('profileSex', sex);
    await s.set('profileActivity', activity ?? '');
    // Saving a profile edit is deliberate, so the target moves with it.
    await recomputeAndSaveGoals();
    haptics.success();
    bump();
    router.back();
  };

  return (
    <Screen>
      <Window title="EDIT PROFILE" onClose={() => router.back()}>
        <View style={{ gap: sp.s }}>
          <Text style={dim}>WEIGHT ({unit.toUpperCase()})</Text>
          <XPTextInput keyboardType="decimal-pad" value={weight} onChangeText={setWeight} />
          <Text style={dim}>HEIGHT (CM)</Text>
          <XPTextInput keyboardType="decimal-pad" value={height} onChangeText={setHeight} />
          <Text style={dim}>AGE</Text>
          <XPTextInput keyboardType="number-pad" value={age} onChangeText={setAge} />
          <Text style={dim}>SEX</Text>
          <View style={{ flexDirection: 'row', gap: sp.s }}>
            <BevelButton title="MALE" small active={sex === 'male'} onPress={() => setSex('male')} style={{ flex: 1 }} />
            <BevelButton title="FEMALE" small active={sex === 'female'} onPress={() => setSex('female')} style={{ flex: 1 }} />
          </View>
        </View>
      </Window>

      <Window title="ACTIVITY">
        <View style={{ gap: sp.s }}>
          {ACTIVITIES.map((act) => (
            <BevelButton
              key={act}
              title={ACTIVITY_LABELS[act].toUpperCase()}
              small
              active={activity === act}
              onPress={() => setActivity((cur) => (cur === act ? undefined : act))}
            />
          ))}
          <Text style={dim}>NONE SELECTED = SEDENTARY</Text>
        </View>
      </Window>

      <Text style={dim}>SAVING UPDATES YOUR CALORIE TARGET.</Text>
      <BevelButton title="SAVE PROFILE" disabled={!valid} onPress={save} />
    </Screen>
  );
}
