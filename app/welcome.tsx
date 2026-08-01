import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuthStore } from '../src/state/authStore';
import { BevelButton } from '../src/ui/BevelButton';
import { Screen } from '../src/ui/Screen';
import { Window } from '../src/ui/Window';
import { dim, label, sp } from '../src/ui/theme';

export default function Welcome() {
  const router = useRouter();
  const accountExists = useAuthStore((s) => s.accountExists);
  return (
    <Screen>
      <Window title="PIKE TRACKER">
        <Text style={[label, { fontSize: 16 }]}>EAT. LIFT. LOG. REPEAT.</Text>
        <Text style={[dim, { marginTop: sp.s }]}>
          C:\&gt; local account · your data stays on this device_
        </Text>
      </Window>
      <View style={{ marginTop: sp.m }}>
        {accountExists ? (
          <BevelButton title="LOG IN" onPress={() => router.push('/log-in')} />
        ) : (
          <BevelButton title="SIGN UP" onPress={() => router.push('/sign-up')} />
        )}
      </View>
    </Screen>
  );
}
