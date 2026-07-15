import { useState } from 'react';
import { Text, View } from 'react-native';
import { getDb } from '../../src/db';
import { useDbQuery } from '../../src/db/useDbQuery';
import { useAppStore } from '../../src/state/appStore';
import { BevelButton } from '../../src/ui/BevelButton';
import { Screen } from '../../src/ui/Screen';
import { Window } from '../../src/ui/Window';
import { XPTextInput } from '../../src/ui/XPTextInput';
import * as haptics from '../../src/ui/haptics';
import { dim, sp } from '../../src/ui/theme';

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

      <Window title="ABOUT">
        <Text style={dim}>PIKE TRACKER v1.0</Text>
        <Text style={[dim, { marginTop: sp.xs }]}>C:\&gt; EAT. LIFT. LOG. REPEAT._</Text>
      </Window>
    </Screen>
  );
}
