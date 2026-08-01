import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { getDb } from '../src/db';
import { Activity, ACTIVITY_LABELS, computeGoals, Sex } from '../src/lib/goals';
import { useAppStore } from '../src/state/appStore';
import { BevelButton } from '../src/ui/BevelButton';
import { Screen } from '../src/ui/Screen';
import { Window } from '../src/ui/Window';
import { XPTextInput } from '../src/ui/XPTextInput';
import * as haptics from '../src/ui/haptics';
import { dim, sp } from '../src/ui/theme';

const ACTIVITIES: Activity[] = ['sedentary', 'light', 'moderate', 'active', 'very_active'];

export default function Onboarding() {
  const router = useRouter();
  const bump = useAppStore((s) => s.bump);
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [activity, setActivity] = useState<Activity | undefined>(undefined);

  const w = Number(weight);
  const h = Number(height);
  const a = Number(age);
  const valid = [w, h, a].every((n) => Number.isFinite(n) && n > 0);

  const finish = async () => {
    if (!valid) return;
    const weightKg = unit === 'lb' ? w * 0.453592 : w;
    const goals = computeGoals({ weightKg, heightCm: h, age: a, sex, activity });
    const s = getDb().settings;
    await s.set('kcalGoal', String(goals.kcal));
    await s.set('proteinGoal', String(goals.protein));
    await s.set('carbsGoal', String(goals.carbs));
    await s.set('fatGoal', String(goals.fat));
    await s.set('weightUnit', unit);
    await s.set('profileWeightKg', String(Math.round(weightKg * 10) / 10));
    await s.set('profileHeightCm', String(h));
    await s.set('profileAge', String(a));
    await s.set('profileSex', sex);
    await s.set('profileActivity', activity ?? '');
    await s.set('onboardingComplete', '1');
    haptics.success();
    bump();
    router.replace('/(tabs)');
  };

  return (
    <Screen>
      <Window title="ABOUT YOU">
        <View style={{ gap: sp.s }}>
          <Text style={dim}>WEIGHT</Text>
          <View style={{ flexDirection: 'row', gap: sp.s }}>
            <XPTextInput keyboardType="decimal-pad" value={weight} onChangeText={setWeight} style={{ flex: 1 }} />
            <BevelButton title="KG" small active={unit === 'kg'} onPress={() => setUnit('kg')} />
            <BevelButton title="LB" small active={unit === 'lb'} onPress={() => setUnit('lb')} />
          </View>
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
      <Window title="ACTIVITY (OPTIONAL)">
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
          <Text style={dim}>SKIP = SEDENTARY</Text>
        </View>
      </Window>
      <BevelButton title="FINISH SETUP" disabled={!valid} onPress={finish} />
    </Screen>
  );
}
