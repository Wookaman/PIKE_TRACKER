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

export default function SignUp() {
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');

  const valid =
    username.trim().length > 0 &&
    password.length >= 4 &&
    password === confirm &&
    question.trim().length > 0 &&
    answer.trim().length > 0;

  const submit = async () => {
    if (!valid) {
      setError(password !== confirm ? 'PASSWORDS DO NOT MATCH' : 'FILL EVERY FIELD (PASSWORD 4+ CHARS)');
      return;
    }
    await signUp(username, password, question, answer);
    haptics.success();
    router.replace('/onboarding');
  };

  return (
    <Screen>
      <Window title="CREATE ACCOUNT" onClose={() => router.back()}>
        <View style={{ gap: sp.s }}>
          <Text style={dim}>USERNAME</Text>
          <XPTextInput autoCapitalize="none" value={username} onChangeText={setUsername} />
          <Text style={dim}>PASSWORD (4+)</Text>
          <XPTextInput secureTextEntry value={password} onChangeText={setPassword} />
          <Text style={dim}>CONFIRM PASSWORD</Text>
          <XPTextInput secureTextEntry value={confirm} onChangeText={setConfirm} />
          <Text style={dim}>SECURITY QUESTION</Text>
          <XPTextInput placeholder="e.g. First pet's name?" value={question} onChangeText={setQuestion} />
          <Text style={dim}>SECURITY ANSWER</Text>
          <XPTextInput value={answer} onChangeText={setAnswer} />
          {error ? <Text style={dim}>{error}</Text> : null}
        </View>
      </Window>
      <BevelButton title="CREATE & CONTINUE" disabled={!valid} onPress={submit} />
    </Screen>
  );
}
