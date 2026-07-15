import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BevelButton } from '../../src/ui/BevelButton';
import { c, sp } from '../../src/ui/theme';

/** Structural subset of the navigation tab-bar props we actually use. */
interface TaskBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: { navigate: (name: string) => void };
}

/** Bottom taskbar: raised strip, each tab a taskbar button, active = sunken. */
function TaskBar({ state, descriptors, navigation }: TaskBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: sp.s,
        backgroundColor: c.raised,
        borderTopWidth: 1,
        borderTopColor: c.borderLight,
        paddingHorizontal: sp.s,
        paddingTop: sp.s,
        paddingBottom: Math.max(insets.bottom, sp.s),
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const title = options.title ?? route.name;
        const active = state.index === index;
        return (
          <BevelButton
            key={route.key}
            title={title}
            small
            active={active}
            onPress={() => {
              if (!active) navigation.navigate(route.name);
            }}
            style={{ flex: 1 }}
          />
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TaskBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'DIARY' }} />
      <Tabs.Screen name="workouts" options={{ title: 'LIFT' }} />
      <Tabs.Screen name="recipes" options={{ title: 'CHEF' }} />
      <Tabs.Screen name="settings" options={{ title: 'SYS' }} />
    </Tabs>
  );
}
