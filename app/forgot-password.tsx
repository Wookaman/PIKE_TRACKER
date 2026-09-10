import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { loadAccount } from '../src/auth/account';
import { useDbQuery } from '../src/db/useDbQuery';
import { useAuthStore } from '../src/state/authStore';
import { BevelButton } from '../src/ui/BevelButton';
import { Screen } from '../src/ui/Screen';
import { Window } from '../src/ui/Window';
import { XPTextInput } from '../src/ui/XPTextInput';
import * as haptics from '../src/ui/haptics';
import { dim, sp } from '../src/ui/theme';

export default function ForgotPassword() {
  const router = useRouter();
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const question = useDbQuery(async () => (await loadAccount())?.securityQuestion ?? '', []) ?? '';
  const [answer, setAnswer] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const valid = answer.trim().length > 0 && password.length >= 4 && password === confirm;

  const submit = async () => {
    if (!valid) {
      setError(password !== confirm ? 'PASSWORDS DO NOT MATCH' : 'PASSWORD 4+ CHARS');
      return;
    }
    const ok = await resetPassword(answer, password);
    if (!ok) {
      haptics.warn();
      setError('WRONG ANSWER');
      return;
    }
    haptics.success();
    router.replace('/(tabs)');
  };

  return (
    <Screen>
      <Window title="RESET PASSWORD" onClose={() => router.back()}>
        <View style={{ gap: sp.s }}>
          <Text style={dim}>{question || 'NO SECURITY QUESTION ON FILE'}</Text>
          <XPTextInput placeholder="Answer" value={answer} onChangeText={setAnswer} />
          <Text style={dim}>NEW PASSWORD (4+)</Text>
          <XPTextInput secureTextEntry value={password} onChangeText={setPassword} />
          <Text style={dim}>CONFIRM</Text>
          <XPTextInput secureTextEntry value={confirm} onChangeText={setConfirm} />
          {error ? <Text style={dim}>{error}</Text> : null}
        </View>
      </Window>
      <BevelButton title="RESET & LOG IN" disabled={!valid} onPress={submit} />
    </Screen>
  );
}
