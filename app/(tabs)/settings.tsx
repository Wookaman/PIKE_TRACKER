import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { getDb } from '../../src/db';
import { useDbQuery } from '../../src/db/useDbQuery';
import { todayKey } from '../../src/lib/dates';
import { Activity, ACTIVITY_LABELS } from '../../src/lib/goals';
import { useAppStore } from '../../src/state/appStore';
import { useAuthStore } from '../../src/state/authStore';
import { BevelButton } from '../../src/ui/BevelButton';
import { Screen } from '../../src/ui/Screen';
import { Window } from '../../src/ui/Window';
import { XPTextInput } from '../../src/ui/XPTextInput';
import * as haptics from '../../src/ui/haptics';
import { data, dim, sp } from '../../src/ui/theme';

function ProfileSection() {
  const router = useRouter();
  const logOut = useAuthStore((s) => s.logOut);
  const tick = useAppStore((s) => s.tick);
  const profile = useDbQuery(async (db) => {
    const s = db.settings;
    return {
      weightKg: await s.get('profileWeightKg'),
      heightCm: await s.get('profileHeightCm'),
      age: await s.get('profileAge'),
      sex: await s.get('profileSex'),
      activity: await s.get('profileActivity'),
    };
  }, [tick]);

  const activityLabel =
    profile?.activity && (profile.activity as Activity) in ACTIVITY_LABELS
      ? ACTIVITY_LABELS[profile.activity as Activity]
      : 'Not set';

  const signOut = async () => {
    await logOut();
    router.replace('/welcome');
  };

  return (
    <>
      <Window title="PROFILE">
        {profile ? (
          <View style={{ gap: 2 }}>
            <Text style={dim}>WEIGHT · {profile.weightKg ?? '—'} kg</Text>
            <Text style={dim}>HEIGHT · {profile.heightCm ?? '—'} cm</Text>
            <Text style={dim}>AGE · {profile.age ?? '—'}</Text>
            <Text style={dim}>SEX · {profile.sex ?? '—'}</Text>
            <Text style={dim}>ACTIVITY · {activityLabel}</Text>
            <Text style={[dim, { marginTop: sp.xs }]}>
              GOALS ABOVE WERE COMPUTED FROM THESE — EDIT ANYTIME.
            </Text>
          </View>
        ) : (
          <Text style={dim}>NO PROFILE YET</Text>
        )}
      </Window>
      <BevelButton title="SIGN OUT" onPress={signOut} />
    </>
  );
}

interface Loaded {
  kcal: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  weightUnit: string;
}

export default function SettingsScreen() {
  const loaded = useDbQuery<Loaded>(async (db) => {
    const s = db.settings;
    const opt = async (key: string) => {
      const v = await s.get(key);
      const n = Number(v);
      return v !== undefined && Number.isFinite(n) && n > 0 ? n : undefined;
    };
    return {
      kcal: await s.getNum('kcalGoal', 2200),
      protein: await opt('proteinGoal'),
      carbs: await opt('carbsGoal'),
      fat: await opt('fatGoal'),
      weightUnit: (await s.get('weightUnit')) ?? 'kg',
    };
  }, []);

  if (!loaded) {
    return (
      <Screen>
        <Window title="SYSTEM">
          <Text style={dim}>LOADING…</Text>
        </Window>
      </Screen>
    );
  }
  return <SettingsForm loaded={loaded} />;
}

function BodyweightSection({ unit }: { unit: string }) {
  const router = useRouter();
  const bump = useAppStore((s) => s.bump);
  const tick = useAppStore((s) => s.tick);
  const latest = useDbQuery((db) => db.bodyweight.latest(), [tick]);
  const [weight, setWeight] = useState('');

  const num = Number(weight);
  const valid = weight.trim().length > 0 && Number.isFinite(num) && num > 0;

  const log = async () => {
    if (!valid) return;
    await getDb().bodyweight.set(todayKey(), num);
    haptics.success();
    setWeight('');
    bump();
  };

  return (
    <>
      <Window
        title="BODYWEIGHT"
        right={latest ? <Text style={data}>{latest.weight} {unit}</Text> : undefined}
      >
        <View style={{ gap: sp.s }}>
          <Text style={dim}>{latest ? `LAST · ${latest.date}` : 'NO ENTRIES YET'}</Text>
          <View style={{ flexDirection: 'row', gap: sp.s }}>
            <XPTextInput
              placeholder={`Today's weight (${unit})`}
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
              style={{ flex: 1 }}
            />
            <BevelButton title="LOG" small disabled={!valid} onPress={log} />
          </View>
        </View>
      </Window>

      <BevelButton title="VIEW PROGRESS ▸" onPress={() => router.push('/progress')} />
    </>
  );
}

function SettingsForm({ loaded }: { loaded: Loaded }) {
  const bump = useAppStore((s) => s.bump);
  const [kcal, setKcal] = useState(String(loaded.kcal));
  const [protein, setProtein] = useState(loaded.protein ? String(loaded.protein) : '');
  const [carbs, setCarbs] = useState(loaded.carbs ? String(loaded.carbs) : '');
  const [fat, setFat] = useState(loaded.fat ? String(loaded.fat) : '');
  const [unit, setUnit] = useState(loaded.weightUnit);
  const [saved, setSaved] = useState(false);

  const kcalNum = Number(kcal);
  const valid = Number.isFinite(kcalNum) && kcalNum > 0;

  const save = async () => {
    if (!valid) return;
    const s = getDb().settings;
    await s.set('kcalGoal', String(Math.round(kcalNum)));
    const setOpt = async (key: string, v: string) => {
      const n = Number(v);
      await s.set(key, v.trim() && Number.isFinite(n) && n > 0 ? String(Math.round(n)) : '');
    };
    await setOpt('proteinGoal', protein);
    await setOpt('carbsGoal', carbs);
    await setOpt('fatGoal', fat);
    await s.set('weightUnit', unit);
    haptics.success();
    bump();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <Screen>
      <Window title="DAILY TARGETS">
        <View style={{ gap: sp.s }}>
          <Text style={dim}>CALORIES (KCAL)</Text>
          <XPTextInput keyboardType="number-pad" value={kcal} onChangeText={setKcal} />
          <Text style={dim}>MACROS (G) — LEAVE BLANK TO SKIP</Text>
          <View style={{ flexDirection: 'row', gap: sp.s }}>
            <XPTextInput placeholder="Protein" keyboardType="number-pad" value={protein} onChangeText={setProtein} style={{ flex: 1 }} />
            <XPTextInput placeholder="Carbs" keyboardType="number-pad" value={carbs} onChangeText={setCarbs} style={{ flex: 1 }} />
            <XPTextInput placeholder="Fat" keyboardType="number-pad" value={fat} onChangeText={setFat} style={{ flex: 1 }} />
          </View>
        </View>
      </Window>

      <Window title="WEIGHT UNIT">
        <View style={{ flexDirection: 'row', gap: sp.s }}>
          <BevelButton title="KG" small active={unit === 'kg'} onPress={() => setUnit('kg')} style={{ flex: 1 }} />
          <BevelButton title="LB" small active={unit === 'lb'} onPress={() => setUnit('lb')} style={{ flex: 1 }} />
        </View>
      </Window>

      <BevelButton title={saved ? 'SAVED ✓' : 'SAVE SETTINGS'} disabled={!valid} onPress={save} />

      <BodyweightSection unit={unit} />

      <ProfileSection />

      <Window title="ABOUT">
        <Text style={dim}>PIKE TRACKER v1.0</Text>
        <Text style={[dim, { marginTop: sp.xs }]}>C:\&gt; EAT. LIFT. LOG. REPEAT._</Text>
      </Window>
    </Screen>
  );
}
