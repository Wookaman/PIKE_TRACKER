import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { initDb } from '../src/db';
import { ensureWebIsolation } from '../src/db/webIsolation';
import { c, label } from '../src/ui/theme';

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [bootError, setBootError] = useState<string | undefined>();

  useEffect(() => {
    if (ensureWebIsolation() !== 'ready') return;
    // 'reloading': the page refreshes itself once the service worker installs.
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
      </Stack>
    </>
  );
}
