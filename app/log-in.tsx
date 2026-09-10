import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useAuthStore } from '../src/state/authStore';
import { BevelButton } from '../src/ui/BevelButton';
import { Screen } from '../src/ui/Screen';
import { Window } from '../src/ui/Window';
import { XPTextInput } from '../src/ui/XPTextInput';
import * as haptics from '../src/ui/haptics';
import { dim, sp } from '../src/ui/theme';

export default function LogIn() {
  const router = useRouter();
  const logIn = useAuthStore((s) => s.logIn);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    const ok = await logIn(username, password);
    if (!ok) {
      haptics.warn();
      setError('INCORRECT USERNAME OR PASSWORD');
      return;
    }
    haptics.success();
    router.replace('/(tabs)');
  };

  return (
    <Screen>
      <Window title="LOG IN" onClose={() => router.back()}>
        <View style={{ gap: sp.s }}>
          <Text style={dim}>USERNAME</Text>
          <XPTextInput autoCapitalize="none" value={username} onChangeText={setUsername} />
          <Text style={dim}>PASSWORD</Text>
          <XPTextInput secureTextEntry value={password} onChangeText={setPassword} />
          {error ? <Text style={dim}>{error}</Text> : null}
        </View>
      </Window>
      <BevelButton title="LOG IN" onPress={submit} />
      <BevelButton title="FORGOT PASSWORD" small onPress={() => router.push('/forgot-password')} />
    </Screen>
  );
}
