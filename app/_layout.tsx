import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { initDb } from '../src/db';
import { c, label } from '../src/ui/theme';

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [bootError, setBootError] = useState<string | undefined>();

  useEffect(() => {
    initDb()
      .then(() => setDbReady(true))
      .catch((e: unknown) => setBootError(String(e)));
  }, []);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={label}>PIKE TRACKER</Text>
        <Text style={[label, { color: c.textDim, marginTop: 8 }]}>
          {bootError ? 'BOOT FAILURE' : 'BOOTING…'}
        </Text>
        {bootError ? (
          <Text style={{ color: c.textDim, marginTop: 8, fontSize: 12, textAlign: 'center' }}>
            {bootError}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="food-search" options={{ presentation: 'modal' }} />
        <Stack.Screen name="food-detail" options={{ presentation: 'modal' }} />
        <Stack.Screen name="recipe-edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="recipe-log" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
