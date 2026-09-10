import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDb } from '../src/db';
import { useAuthStore } from '../src/state/authStore';
import { c, label } from '../src/ui/theme';

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [bootError, setBootError] = useState<string | undefined>();
  const status = useAuthStore((s) => s.status);
  const refresh = useAuthStore((s) => s.refresh);

  useEffect(() => {
    initDb()
      .then(() => refresh())
      .then(() => setDbReady(true))
      .catch((e: unknown) => setBootError(String(e)));
  }, [refresh]);

  if (!dbReady || status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={label}>PIKE TRACKER</Text>
        <Text style={[label, { color: c.textDim, marginTop: 8 }]}>
          {bootError ? 'BOOT FAILURE' : 'BOOTING…'}
        </Text>
        {bootError ? (
          <Text style={{ color: c.textDim, marginTop: 8, fontSize: 12, textAlign: 'center' }}>{bootError}</Text>
        ) : null}
      </View>
    );
  }

  // Single stack; `app/index.tsx` redirects by auth status on cold boot, and
  // the auth screens navigate explicitly on sign-in / sign-out. Keeping one
  // navigator avoids the pitfalls of swapping navigators mid-session.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="log-in" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="food-search" options={{ presentation: 'modal' }} />
        <Stack.Screen name="food-detail" options={{ presentation: 'modal' }} />
        <Stack.Screen name="recipe-edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="recipe-log" options={{ presentation: 'modal' }} />
        <Stack.Screen name="exercise-search" options={{ presentation: 'modal' }} />
        <Stack.Screen name="exercise-edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="workout-entry" options={{ presentation: 'modal' }} />
        <Stack.Screen name="progress" options={{ presentation: 'modal' }} />
        <Stack.Screen name="barcode-scan" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
