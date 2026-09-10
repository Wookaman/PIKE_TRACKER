import { Text, View } from 'react-native';
import { isRateAllowed, RATE_OPTIONS, rateLabel, Sex, WeeklyRate } from '../lib/goals';
import { BevelButton } from '../ui/BevelButton';
import { dim, sp } from '../ui/theme';

interface RatePickerProps {
  value: WeeklyRate;
  onChange: (rate: WeeklyRate) => void;
  /** Maintenance calories — used to gate deficits that would fall too low. */
  tdeeValue: number;
  sex: Sex;
  unit: string;
}

/**
 * The nine weekly weight-change options. Deficits that would drop the target
 * below the safe floor render disabled and marked BELOW MINIMUM.
 */
export function RatePicker({ value, onChange, tdeeValue, sex, unit }: RatePickerProps) {
  return (
    <View style={{ gap: sp.s }}>
      {RATE_OPTIONS.map((rate) => {
        const allowed = isRateAllowed(tdeeValue, rate, sex);
        return (
          <View key={rate} style={{ flexDirection: 'row', alignItems: 'center', gap: sp.s }}>
            <BevelButton
              title={rateLabel(rate, unit)}
              small
              active={allowed && value === rate}
              disabled={!allowed}
              onPress={() => onChange(rate)}
              style={{ flex: 1 }}
            />
            {!allowed ? <Text style={dim}>BELOW MINIMUM</Text> : null}
          </View>
        );
      })}
    </View>
  );
}
