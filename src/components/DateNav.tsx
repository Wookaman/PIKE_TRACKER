import { Text, View } from 'react-native';
import { addDaysKey, dayTitle, todayKey } from '../lib/dates';
import { useAppStore } from '../state/appStore';
import { BevelButton } from '../ui/BevelButton';
import { dim, label, sp } from '../ui/theme';

/** ‹ DAY › navigation strip with TODAY shortcut. */
export function DateNav() {
  const dateKey = useAppStore((s) => s.dateKey);
  const setDateKey = useAppStore((s) => s.setDateKey);
  const isToday = dateKey === todayKey();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp.s }}>
      <BevelButton title="‹" small onPress={() => setDateKey(addDaysKey(dateKey, -1))} />
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={[label, { fontSize: 14 }]}>{dayTitle(dateKey)}</Text>
        <Text style={dim}>{dateKey}</Text>
      </View>
      {!isToday && <BevelButton title="TODAY" small onPress={() => setDateKey(todayKey())} />}
      <BevelButton title="›" small onPress={() => setDateKey(addDaysKey(dateKey, 1))} />
    </View>
  );
}
