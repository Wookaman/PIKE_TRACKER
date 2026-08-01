import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/state/authStore';

/** Entry route: send signed-in users to the app, everyone else to Welcome. */
export default function Index() {
  const status = useAuthStore((s) => s.status);
  if (status === 'signedIn') return <Redirect href="/(tabs)" />;
  return <Redirect href="/welcome" />;
}
