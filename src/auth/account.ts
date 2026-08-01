import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCOUNT_KEY = 'pike.account';
const SESSION_KEY = 'pike.session';

// expo-secure-store has no web binding, so the web preview falls back to
// localStorage. On device this uses the OS keychain/keystore.
const webStore = () => (globalThis as { localStorage?: Storage }).localStorage;

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return webStore()?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    webStore()?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    webStore()?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export interface AccountRecord {
  username: string;
  salt: string;
  passwordHash: string;
  securityQuestion: string;
  securityAnswerHash: string;
}

export async function loadAccount(): Promise<AccountRecord | undefined> {
  const raw = await getItem(ACCOUNT_KEY);
  return raw ? (JSON.parse(raw) as AccountRecord) : undefined;
}

export async function saveAccount(a: AccountRecord): Promise<void> {
  await setItem(ACCOUNT_KEY, JSON.stringify(a));
}

export async function hasAccount(): Promise<boolean> {
  return (await getItem(ACCOUNT_KEY)) !== null;
}

export async function deleteAccount(): Promise<void> {
  await removeItem(ACCOUNT_KEY);
  await removeItem(SESSION_KEY);
}

/** Session flag persists across restarts until sign-out. */
export async function isSignedIn(): Promise<boolean> {
  return (await getItem(SESSION_KEY)) === '1';
}

export async function setSignedIn(v: boolean): Promise<void> {
  if (v) await setItem(SESSION_KEY, '1');
  else await removeItem(SESSION_KEY);
}
