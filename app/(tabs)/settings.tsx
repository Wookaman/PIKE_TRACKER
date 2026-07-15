import { useState } from 'react';
import { Text, View } from 'react-native';
import { BevelButton } from '../../src/ui/BevelButton';
import { ListRow } from '../../src/ui/ListRow';
import { Screen } from '../../src/ui/Screen';
import { SunkenPanel } from '../../src/ui/SunkenPanel';
import { Window } from '../../src/ui/Window';
import { XPProgress } from '../../src/ui/XPProgress';
import { XPTextInput } from '../../src/ui/XPTextInput';
import { body, data, dim, sp } from '../../src/ui/theme';

/** Temporary component showcase — replaced by real settings in Task 12. */
export default function SettingsScreen() {
  const [kcal, setKcal] = useState(1430);

  return (
    <Screen>
      <Window title="SYSTEM // SHOWCASE" right={<Text style={dim}>v1</Text>}>
        <Text style={body}>Design system smoke screen.</Text>
      </Window>

      <Window title="BUTTONS">
        <View style={{ flexDirection: 'row', gap: sp.s }}>
          <BevelButton title="PRESS ME" onPress={() => setKcal((v) => v + 110)} style={{ flex: 1 }} />
          <BevelButton title="ACTIVE" active style={{ flex: 1 }} />
          <BevelButton title="OFF" disabled style={{ flex: 1 }} />
        </View>
      </Window>

      <Window title="ENERGY" right={<Text style={data}>{kcal} / 2200</Text>}>
        <XPProgress value={kcal} max={2200} />
      </Window>

      <Window title="INPUT">
        <XPTextInput placeholder="C:\> search foods_" />
      </Window>

      <Window title="LIST">
        <SunkenPanel>
          <ListRow title="Chicken breast" subtitle="165 kcal / 100 g" right={<Text style={data}>150g</Text>} onPress={() => {}} />
          <ListRow title="White rice, cooked" subtitle="130 kcal / 100 g" right={<Text style={data}>185g</Text>} onPress={() => {}} />
          <ListRow title="Olive oil" subtitle="884 kcal / 100 g" right={<Text style={data}>10g</Text>} onPress={() => {}} />
        </SunkenPanel>
      </Window>
    </Screen>
  );
}
