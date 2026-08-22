import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { RatePicker } from '../../src/components/RatePicker';
import { getDb } from '../../src/db';
import { useDbQuery } from '../../src/db/useDbQuery';
import { todayKey } from '../../src/lib/dates';
import { Activity, ACTIVITY_LABELS, rateLabel, Sex, tdee, WeeklyRate } from '../../src/lib/goals';
import { displayWeight, toCanonicalKg } from '../../src/lib/units';
import { useAppStore } from '../../src/state/appStore';
import { useAuthStore } from '../../src/state/authStore';
import { loadProfile, loadRate, recomputeAndSaveGoals } from '../../src/state/goalActions';
import { BevelButton } from '../../src/ui/BevelButton';
import { Screen } from '../../src/ui/Screen';
import { Window } from '../../src/ui/Window';
import { XPTextInput } from '../../src/ui/XPTextInput';
import * as haptics from '../../src/ui/haptics';
import { data, dim, sp } from '../../src/ui/theme';

const ACTIVITIES: Activity[] = ['sedentary', 'light', 'moderate', 'active', 'very_active'];

interface Loaded {
  kcal: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  weightUnit: string;
  rate: WeeklyRate;
  goalSource: string;
  sex: Sex;
  activity?: Activity;
  tdeeValue: number;
  hasProfile: boolean;
}

export default function SettingsScreen() {
  const tick = useAppStore((s) => s.tick);

  const loaded = useDbQuery<Loaded>(
    async (db) => {
      const s = db.settings;
      const opt = async (key: string) => {
        const v = await s.get(key);
        const n = Number(v);
        return v !== undefined && Number.isFinite(n) && n > 0 ? n : undefined;
      };
      const profile = await loadProfile();
      return {
        kcal: await s.getNum('kcalGoal', 2200),
        protein: await opt('proteinGoal'),
        carbs: await opt('carbsGoal'),
        fat: await opt('fatGoal'),
        weightUnit: (await s.get('weightUnit')) ?? 'kg',
        rate: await loadRate(),
        goalSource: (await s.get('goalSource')) ?? '',
        sex: profile.sex,
        activity: profile.activity,
        hasProfile: profile.complete,
        tdeeValue: profile.complete
          ? tdee({
              weightKg: profile.weightKg,
              heightCm: profile.heightCm,
              age: profile.age,
              sex: profile.sex,
              activity: profile.activity,
            })
          : Number.POSITIVE_INFINITY,
      };
    },
    [tick],
  );

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

function GoalSection({ loaded }: { loaded: Loaded }) {
  const bump = useAppStore((s) => s.bump);
  const [note, setNote] = useState('');

  const flash = (msg: string) => {
    setNote(msg);
    setTimeout(() => setNote(''), 1500);
  };

  const changeRate = async (rate: WeeklyRate) => {
    if (!loaded.hasProfile) {
      flash('NEEDS A PROFILE FIRST');
      return;
    }
    await recomputeAndSaveGoals({ rate });
    haptics.success();
    bump();
  };

  const changeActivity = async (activity: Activity) => {
    // A deliberate edit, so the target moves right away.
    await getDb().settings.set('profileActivity', activity);
    await recomputeAndSaveGoals();
    haptics.success();
    bump();
  };

  const recalculate = async () => {
    const latest = await getDb().bodyweight.latest();
    const goals = await recomputeAndSaveGoals(
      latest ? { weightKg: latest.weight, persistWeight: true } : {},
    );
    if (!goals) {
      flash('NEEDS A PROFILE FIRST');
      return;
    }
    haptics.success();
    flash(latest ? 'RECALCULATED FROM LATEST WEIGHT' : 'RECALCULATED');
    bump();
  };

  return (
    <>
      <Window
        title="GOAL"
        right={<Text style={data}>{rateLabel(loaded.rate, loaded.weightUnit)}</Text>}
      >
        <View style={{ gap: sp.s }}>
          <Text style={dim}>WEEKLY WEIGHT TARGET — SETS YOUR CALORIES</Text>
          <RatePicker
            value={loaded.rate}
            onChange={changeRate}
            tdeeValue={loaded.tdeeValue}
            sex={loaded.sex}
            unit={loaded.weightUnit}
          />
        </View>
      </Window>

      <Window title="ACTIVITY">
        <View style={{ gap: sp.s }}>
          {ACTIVITIES.map((act) => (
            <BevelButton
              key={act}
              title={ACTIVITY_LABELS[act].toUpperCase()}
              small
              active={loaded.activity === act}
              onPress={() => changeActivity(act)}
            />
          ))}
        </View>
      </Window>

      <BevelButton title="RECALCULATE FROM LATEST WEIGHT" onPress={recalculate} />
      {note ? <Text style={dim}>{note}</Text> : null}
    </>
  );
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
    // Stored canonically in kg; `unit` is display only.
    await getDb().bodyweight.set(todayKey(), toCanonicalKg(num, unit));
    haptics.success();
    setWeight('');
    bump();
  };

  return (
    <>
      <Window
        title="BODYWEIGHT"
        right={
          latest ? (
            <Text style={data}>
              {displayWeight(latest.weight, unit)} {unit}
            </Text>
          ) : undefined
        }
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

function ProfileSection({ unit }: { unit: string }) {
  const router = useRouter();
  const logOut = useAuthStore((s) => s.logOut);
  const tick = useAppStore((s) => s.tick);
  const profile = useDbQuery(() => loadProfile(), [tick]);

  const activityLabel = profile?.activity ? ACTIVITY_LABELS[profile.activity] : 'Not set';

  const signOut = async () => {
    await logOut();
    router.replace('/welcome');
  };

  return (
    <>
      <Window title="PROFILE">
        {profile?.complete ? (
          <View style={{ gap: 2 }}>
            <Text style={dim}>
              WEIGHT · {displayWeight(profile.weightKg, unit)} {unit}
            </Text>
            <Text style={dim}>HEIGHT · {profile.heightCm} cm</Text>
            <Text style={dim}>AGE · {profile.age}</Text>
            <Text style={dim}>SEX · {profile.sex}</Text>
            <Text style={dim}>ACTIVITY · {activityLabel}</Text>
          </View>
        ) : (
          <Text style={dim}>NO PROFILE YET</Text>
        )}
      </Window>
      <BevelButton title="EDIT PROFILE ▸" onPress={() => router.push('/edit-profile')} />
      <BevelButton title="SIGN OUT" onPress={signOut} />
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

  // Reseed the editable fields when a recompute (rate change, activity change,
  // profile save, RECALCULATE) rewrites the stored targets. Done with an effect
  // rather than a remount so the scroll position is preserved.
  useEffect(() => {
    setKcal(String(loaded.kcal));
    setProtein(loaded.protein ? String(loaded.protein) : '');
    setCarbs(loaded.carbs ? String(loaded.carbs) : '');
    setFat(loaded.fat ? String(loaded.fat) : '');
  }, [loaded.kcal, loaded.protein, loaded.carbs, loaded.fat]);

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
    // Hand-typed numbers no longer match the computed goal.
    await s.set('goalSource', 'manual');
    haptics.success();
    bump();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <Screen>
      <Window
        title="DAILY TARGETS"
        right={
          <Text style={dim}>
            {loaded.goalSource === 'manual' ? 'EDITED MANUALLY' : 'COMPUTED FROM GOAL'}
          </Text>
        }
      >
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

      <GoalSection loaded={loaded} />

      <BodyweightSection unit={unit} />

      <ProfileSection unit={unit} />

      <Window title="ABOUT">
        <Text style={dim}>PIKE TRACKER v1.0</Text>
        <Text style={[dim, { marginTop: sp.xs }]}>C:\&gt; EAT. LIFT. LOG. REPEAT._</Text>
      </Window>
    </Screen>
  );
}
