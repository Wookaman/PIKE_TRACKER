import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#8a8a92',
        tabBarStyle: { backgroundColor: '#1e1e22', borderTopColor: '#000000' },
        sceneStyle: { backgroundColor: '#0b0b0d' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'DIARY' }} />
      <Tabs.Screen name="workouts" options={{ title: 'LIFT' }} />
      <Tabs.Screen name="recipes" options={{ title: 'CHEF' }} />
      <Tabs.Screen name="settings" options={{ title: 'SYS' }} />
    </Tabs>
  );
}
