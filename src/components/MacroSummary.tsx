import { Text, View } from 'react-native';
import { Macros } from '../lib/types';
import { Window } from '../ui/Window';
import { XPProgress } from '../ui/XPProgress';
import { data, dim, sp } from '../ui/theme';

interface MacroSummaryProps {
  totals: Macros;
  kcalGoal: number;
  proteinGoal?: number;
  carbsGoal?: number;
  fatGoal?: number;
}

function goalText(value: number, goal?: number): string {
  return goal ? `${Math.round(value)} / ${goal}g` : `${Math.round(value)}g`;
}

/** Day energy bar + macro readout. */
export function MacroSummary({ totals, kcalGoal, proteinGoal, carbsGoal, fatGoal }: MacroSummaryProps) {
  return (
    <Window title="ENERGY" right={<Text style={data}>{totals.kcal} / {kcalGoal}</Text>}>
      <XPProgress value={totals.kcal} max={kcalGoal} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: sp.s }}>
        <Text style={[data, dim]}>P {goalText(totals.protein, proteinGoal)}</Text>
        <Text style={[data, dim]}>C {goalText(totals.carbs, carbsGoal)}</Text>
        <Text style={[data, dim]}>F {goalText(totals.fat, fatGoal)}</Text>
      </View>
    </Window>
  );
}
