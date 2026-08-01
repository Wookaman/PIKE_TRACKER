# Onboarding + Local Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline; harness rules forbid unsolicited subagents). Steps use checkbox (`- [ ]`) syntax. Spec: `docs/superpowers/specs/2026-08-01-onboarding-local-auth-design.md` — the requirements source.

**Goal:** Gate the app behind a local (on-device) account with a persisted session, and run a first-launch onboarding that computes starting calorie/macro goals from body stats — all offline, still Expo-Go-compatible.

**Architecture:** Pure goal math in `src/lib/goals.ts` (TDD). Auth secrets + session in `expo-secure-store`; password/answer hashing via `expo-crypto`; a zustand `authStore` exposes `status` that the root layout uses to render an auth stack (welcome/sign-up/onboarding/log-in/forgot-password) vs the existing app stack. Profile stats + computed goals seed the existing `settings` key-value store, so manual goal editing on SYS is untouched.

**Tech Stack:** Expo SDK 54, TypeScript strict, expo-router, expo-sqlite, expo-secure-store (new), expo-crypto (new), zustand, jest.

## Global Constraints

- Expo SDK 54 — install `expo-secure-store` and `expo-crypto` via `npx expo install` (do not hand-pick versions).
- TypeScript `strict`; no `any` in committed code.
- `src/lib/**` must not import React/React Native or Expo native modules (goal math is pure). Auth code that uses expo modules lives in `src/auth/**` and `src/state/**`.
- Passwords/answers: never store plaintext — store salted, iterated SHA-256 (hex). Random 16-byte salt per account.
- Secure-store keys: `pike.account` (JSON AccountRecord), `pike.session` (`'1'` when signed in).
- One user per device. Welcome shows exactly one button (SIGN UP if no account, else LOG IN).
- Every task ends: `npm test` green + `npx tsc --noEmit` clean + commit. Conventional commits.

---

### Task 1: Goal math (pure, TDD)

**Files:**
- Create: `src/lib/goals.ts`
- Test: `src/lib/goals.test.ts`

**Interfaces produced:**
```ts
export type Sex = 'male' | 'female';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export interface GoalInput { weightKg: number; heightCm: number; age: number; sex: Sex; activity?: Activity }
export interface Goals { kcal: number; protein: number; carbs: number; fat: number }
export function bmrMifflin(weightKg: number, heightCm: number, age: number, sex: Sex): number;
export function computeGoals(input: GoalInput): Goals;
export const ACTIVITY_LABELS: Record<Activity, string>;
```

- [ ] **Step 1: Write failing tests** — `src/lib/goals.test.ts`:

```ts
import { bmrMifflin, computeGoals } from './goals';

describe('bmrMifflin', () => {
  it('male: 10w + 6.25h - 5a + 5', () => {
    expect(bmrMifflin(80, 180, 30, 'male')).toBeCloseTo(10 * 80 + 6.25 * 180 - 5 * 30 + 5, 5); // 1780
  });
  it('female: 10w + 6.25h - 5a - 161', () => {
    expect(bmrMifflin(60, 165, 25, 'female')).toBeCloseTo(10 * 60 + 6.25 * 165 - 5 * 25 - 161, 5); // 1345.25
  });
});

describe('computeGoals', () => {
  it('applies activity factor and whole-number kcal (moderate)', () => {
    const g = computeGoals({ weightKg: 80, heightCm: 180, age: 30, sex: 'male', activity: 'moderate' });
    expect(g.kcal).toBe(Math.round(1780 * 1.55)); // 2759
  });
  it('defaults missing activity to sedentary (1.2)', () => {
    const g = computeGoals({ weightKg: 80, heightCm: 180, age: 30, sex: 'male' });
    expect(g.kcal).toBe(Math.round(1780 * 1.2)); // 2136
  });
  it('splits macros 30/40/30 into grams (4/4/9 kcal per g)', () => {
    const g = computeGoals({ weightKg: 80, heightCm: 180, age: 30, sex: 'male', activity: 'sedentary' });
    const kcal = g.kcal; // 2136
    expect(g.protein).toBe(Math.round((kcal * 0.3) / 4));
    expect(g.carbs).toBe(Math.round((kcal * 0.4) / 4));
    expect(g.fat).toBe(Math.round((kcal * 0.3) / 9));
  });
  it('every activity factor is applied', () => {
    const base = { weightKg: 70, heightCm: 175, age: 28, sex: 'female' as const };
    const bmr = bmrMifflin(70, 175, 28, 'female');
    const factors: [import('./goals').Activity, number][] = [
      ['sedentary', 1.2], ['light', 1.375], ['moderate', 1.55], ['active', 1.725], ['very_active', 1.9],
    ];
    for (const [a, f] of factors) {
      expect(computeGoals({ ...base, activity: a }).kcal).toBe(Math.round(bmr * f));
    }
  });
});
```

- [ ] **Step 2: Run to verify fail** — `npm test -- src/lib/goals` → FAIL (module missing).

- [ ] **Step 3: Implement** — `src/lib/goals.ts`:

```ts
export type Sex = 'male' | 'female';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface GoalInput {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  activity?: Activity;
}
export interface Goals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

const ACTIVITY_FACTOR: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<Activity, string> = {
  sedentary: 'Sedentary',
  light: 'Lightly active',
  moderate: 'Moderately active',
  active: 'Active',
  very_active: 'Very active',
};

/** Mifflin–St Jeor basal metabolic rate. */
export function bmrMifflin(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
}

export function computeGoals(input: GoalInput): Goals {
  const bmr = bmrMifflin(input.weightKg, input.heightCm, input.age, input.sex);
  const kcal = Math.round(bmr * ACTIVITY_FACTOR[input.activity ?? 'sedentary']);
  return {
    kcal,
    protein: Math.round((kcal * 0.3) / 4),
    carbs: Math.round((kcal * 0.4) / 4),
    fat: Math.round((kcal * 0.3) / 9),
  };
}
```

- [ ] **Step 4: Run to verify pass** — `npm test -- src/lib/goals` → PASS; `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**
```bash
git add src/lib/goals.ts src/lib/goals.test.ts
git commit -m "feat: Mifflin-St Jeor goal calculation (pure lib)"
```

---

### Task 2: Auth crypto + secure-store account layer

**Files:**
- Create: `src/auth/crypto.ts`, `src/auth/account.ts`
- Modify: `package.json`/lockfile (expo-secure-store, expo-crypto)

**Interfaces produced:**
```ts
// crypto.ts
export function makeSalt(): Promise<string>;                        // 16 random bytes -> hex
export function hashSecret(secret: string, salt: string): Promise<string>; // salted iterated SHA-256 hex
// account.ts
export interface AccountRecord {
  username: string; salt: string; passwordHash: string;
  securityQuestion: string; securityAnswerHash: string;
}
export function loadAccount(): Promise<AccountRecord | undefined>;
export function saveAccount(a: AccountRecord): Promise<void>;
export function hasAccount(): Promise<boolean>;
export function deleteAccount(): Promise<void>;
export function isSignedIn(): Promise<boolean>;
export function setSignedIn(v: boolean): Promise<void>;
```

- [ ] **Step 1: Install deps**
```bash
npx expo install expo-secure-store expo-crypto
```
Verify with `npx expo install --check` → "Dependencies are up to date".

- [ ] **Step 2: Implement `src/auth/crypto.ts`**

```ts
import * as Crypto from 'expo-crypto';

const ITERATIONS = 5000;

/** 16 random bytes as hex. */
export async function makeSalt(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Salted, iterated SHA-256. Deterministic for the same (secret, salt). */
export async function hashSecret(secret: string, salt: string): Promise<string> {
  let digest = `${salt}:${secret}`;
  for (let i = 0; i < ITERATIONS; i++) {
    digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, digest);
  }
  return digest;
}
```

- [ ] **Step 3: Implement `src/auth/account.ts`**

```ts
import * as SecureStore from 'expo-secure-store';

const ACCOUNT_KEY = 'pike.account';
const SESSION_KEY = 'pike.session';

export interface AccountRecord {
  username: string;
  salt: string;
  passwordHash: string;
  securityQuestion: string;
  securityAnswerHash: string;
}

export async function loadAccount(): Promise<AccountRecord | undefined> {
  const raw = await SecureStore.getItemAsync(ACCOUNT_KEY);
  return raw ? (JSON.parse(raw) as AccountRecord) : undefined;
}

export async function saveAccount(a: AccountRecord): Promise<void> {
  await SecureStore.setItemAsync(ACCOUNT_KEY, JSON.stringify(a));
}

export async function hasAccount(): Promise<boolean> {
  return (await SecureStore.getItemAsync(ACCOUNT_KEY)) !== null;
}

export async function deleteAccount(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCOUNT_KEY);
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function isSignedIn(): Promise<boolean> {
  return (await SecureStore.getItemAsync(SESSION_KEY)) === '1';
}

export async function setSignedIn(v: boolean): Promise<void> {
  if (v) await SecureStore.setItemAsync(SESSION_KEY, '1');
  else await SecureStore.deleteItemAsync(SESSION_KEY);
}
```

- [ ] **Step 4: Typecheck** — `npx tsc --noEmit` → clean. `npm test` → still green (no new unit tests; these are native-backed and verified on web in Task 7).

- [ ] **Step 5: Commit**
```bash
git add src/auth/crypto.ts src/auth/account.ts package.json package-lock.json
git commit -m "feat: local account credential storage (expo-secure-store + expo-crypto)"
```

---

### Task 3: authStore (zustand)

**Files:**
- Create: `src/state/authStore.ts`

**Interfaces consumed:** `makeSalt`, `hashSecret` (Task 2 crypto); `loadAccount`, `saveAccount`, `setSignedIn`, `isSignedIn`, `hasAccount`, `AccountRecord` (Task 2 account).

**Interfaces produced:**
```ts
type AuthStatus = 'loading' | 'signedOut' | 'signedIn';
interface AuthState {
  status: AuthStatus;
  accountExists: boolean;
  refresh(): Promise<void>;
  signUp(username: string, password: string, securityQuestion: string, securityAnswer: string): Promise<void>;
  logIn(username: string, password: string): Promise<boolean>;   // false on bad credentials
  resetPassword(answer: string, newPassword: string): Promise<boolean>; // false on wrong answer
  logOut(): Promise<void>;
}
export const useAuthStore: UseBoundStore<...>;
```

- [ ] **Step 1: Implement `src/state/authStore.ts`**

```ts
import { create } from 'zustand';
import {
  AccountRecord,
  hasAccount,
  isSignedIn,
  loadAccount,
  saveAccount,
  setSignedIn,
} from '../auth/account';
import { hashSecret, makeSalt } from '../auth/crypto';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

const norm = (s: string) => s.trim().toLowerCase();

interface AuthState {
  status: AuthStatus;
  accountExists: boolean;
  refresh: () => Promise<void>;
  signUp: (username: string, password: string, securityQuestion: string, securityAnswer: string) => Promise<void>;
  logIn: (username: string, password: string) => Promise<boolean>;
  resetPassword: (answer: string, newPassword: string) => Promise<boolean>;
  logOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  accountExists: false,

  refresh: async () => {
    const exists = await hasAccount();
    const signed = exists && (await isSignedIn());
    set({ accountExists: exists, status: signed ? 'signedIn' : 'signedOut' });
  },

  signUp: async (username, password, securityQuestion, securityAnswer) => {
    const salt = await makeSalt();
    const record: AccountRecord = {
      username: username.trim(),
      salt,
      passwordHash: await hashSecret(password, salt),
      securityQuestion: securityQuestion.trim(),
      securityAnswerHash: await hashSecret(norm(securityAnswer), salt),
    };
    await saveAccount(record);
    await setSignedIn(true);
    set({ accountExists: true, status: 'signedIn' });
  },

  logIn: async (username, password) => {
    const acc = await loadAccount();
    if (!acc) return false;
    const ok = acc.username.toLowerCase() === norm(username) && (await hashSecret(password, acc.salt)) === acc.passwordHash;
    if (!ok) return false;
    await setSignedIn(true);
    set({ status: 'signedIn' });
    return true;
  },

  resetPassword: async (answer, newPassword) => {
    const acc = await loadAccount();
    if (!acc) return false;
    if ((await hashSecret(norm(answer), acc.salt)) !== acc.securityAnswerHash) return false;
    await saveAccount({ ...acc, passwordHash: await hashSecret(newPassword, acc.salt) });
    await setSignedIn(true);
    set({ status: 'signedIn' });
    return true;
  },

  logOut: async () => {
    await setSignedIn(false);
    set({ status: 'signedOut' });
  },
}));
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → clean.

- [ ] **Step 3: Commit**
```bash
git add src/state/authStore.ts
git commit -m "feat: auth store (sign up / log in / reset / sign out)"
```

---

### Task 4: Root gate — auth stack vs app stack

**Files:**
- Modify: `app/_layout.tsx`

**Interfaces consumed:** `useAuthStore` (Task 3).

- [ ] **Step 1: Implement** — replace `app/_layout.tsx` so it runs `initDb()` AND `authStore.refresh()`, then renders by `status`:

```tsx
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
        <Text style={[label, { color: c.textDim, marginTop: 8 }]}>{bootError ? 'BOOT FAILURE' : 'BOOTING…'}</Text>
        {bootError ? (
          <Text style={{ color: c.textDim, marginTop: 8, fontSize: 12, textAlign: 'center' }}>{bootError}</Text>
        ) : null}
      </View>
    );
  }

  const screenOptions = { headerShown: false, contentStyle: { backgroundColor: c.bg } } as const;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      {status === 'signedIn' ? (
        <Stack screenOptions={screenOptions}>
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
        </Stack>
      ) : (
        <Stack screenOptions={screenOptions}>
          <Stack.Screen name="welcome" />
          <Stack.Screen name="sign-up" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="log-in" />
          <Stack.Screen name="forgot-password" />
        </Stack>
      )}
    </GestureHandlerRootView>
  );
}
```
Note: expo-router requires an initial route resolvable when signed out. Because `(tabs)/index` is the default and it must NOT be the entry while signed out, add `app/index.tsx` (Task 5) that redirects based on status, and set the auth Stack's first screen to `welcome`. (expo-router picks `index` as `/`; the redirect there prevents the tabs from mounting pre-auth.)

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → clean (screens referenced by name are added in Task 5; router name typing tolerates missing files at compile time but the app won't run until Task 5 — acceptable within this task boundary; do not web-test until Task 5).

- [ ] **Step 3: Commit**
```bash
git add "app/_layout.tsx"
git commit -m "feat: root auth gate (auth stack vs app stack by status)"
```

---

### Task 5: Auth + onboarding screens

**Files:**
- Create: `app/index.tsx`, `app/welcome.tsx`, `app/sign-up.tsx`, `app/onboarding.tsx`, `app/log-in.tsx`, `app/forgot-password.tsx`

**Interfaces consumed:** `useAuthStore` (Task 3); `computeGoals`, `ACTIVITY_LABELS`, `Sex`, `Activity` (Task 1); `getDb().settings.set` (existing); `loadAccount` (Task 2) for the security question on forgot-password; `useAppStore().bump` (existing).

- [ ] **Step 1: `app/index.tsx`** — redirect entry so tabs never mount pre-auth:

```tsx
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/state/authStore';

export default function Index() {
  const status = useAuthStore((s) => s.status);
  if (status === 'signedIn') return <Redirect href="/(tabs)" />;
  return <Redirect href="/welcome" />;
}
```

- [ ] **Step 2: `app/welcome.tsx`** — one button by account existence:

```tsx
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
        <Text style={[dim, { marginTop: sp.s }]}>C:\&gt; local account · your data stays on this device_</Text>
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
```

- [ ] **Step 3: `app/sign-up.tsx`** — account form → onboarding:

```tsx
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
      <Window title="CREATE ACCOUNT">
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
```

- [ ] **Step 4: `app/onboarding.tsx`** — stats → goals → settings:

```tsx
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { getDb } from '../src/db';
import { Activity, ACTIVITY_LABELS, computeGoals, Sex } from '../src/lib/goals';
import { useAppStore } from '../src/state/appStore';
import { BevelButton } from '../src/ui/BevelButton';
import { Screen } from '../src/ui/Screen';
import { Window } from '../src/ui/Window';
import { XPTextInput } from '../src/ui/XPTextInput';
import * as haptics from '../src/ui/haptics';
import { dim, sp } from '../src/ui/theme';

const ACTIVITIES: Activity[] = ['sedentary', 'light', 'moderate', 'active', 'very_active'];

export default function Onboarding() {
  const router = useRouter();
  const bump = useAppStore((s) => s.bump);
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [activity, setActivity] = useState<Activity | undefined>(undefined);

  const w = Number(weight);
  const h = Number(height);
  const a = Number(age);
  const valid = [w, h, a].every((n) => Number.isFinite(n) && n > 0);

  const finish = async () => {
    if (!valid) return;
    const weightKg = unit === 'lb' ? w * 0.453592 : w;
    const goals = computeGoals({ weightKg, heightCm: h, age: a, sex, activity });
    const s = getDb().settings;
    await s.set('kcalGoal', String(goals.kcal));
    await s.set('proteinGoal', String(goals.protein));
    await s.set('carbsGoal', String(goals.carbs));
    await s.set('fatGoal', String(goals.fat));
    await s.set('weightUnit', unit);
    await s.set('profileWeightKg', String(Math.round(weightKg * 10) / 10));
    await s.set('profileHeightCm', String(h));
    await s.set('profileAge', String(a));
    await s.set('profileSex', sex);
    await s.set('profileActivity', activity ?? '');
    await s.set('onboardingComplete', '1');
    haptics.success();
    bump();
    router.replace('/(tabs)');
  };

  return (
    <Screen>
      <Window title="ABOUT YOU">
        <View style={{ gap: sp.s }}>
          <Text style={dim}>WEIGHT</Text>
          <View style={{ flexDirection: 'row', gap: sp.s }}>
            <XPTextInput keyboardType="decimal-pad" value={weight} onChangeText={setWeight} style={{ flex: 1 }} />
            <BevelButton title="KG" small active={unit === 'kg'} onPress={() => setUnit('kg')} />
            <BevelButton title="LB" small active={unit === 'lb'} onPress={() => setUnit('lb')} />
          </View>
          <Text style={dim}>HEIGHT (CM)</Text>
          <XPTextInput keyboardType="decimal-pad" value={height} onChangeText={setHeight} />
          <Text style={dim}>AGE</Text>
          <XPTextInput keyboardType="number-pad" value={age} onChangeText={setAge} />
          <Text style={dim}>SEX</Text>
          <View style={{ flexDirection: 'row', gap: sp.s }}>
            <BevelButton title="MALE" small active={sex === 'male'} onPress={() => setSex('male')} style={{ flex: 1 }} />
            <BevelButton title="FEMALE" small active={sex === 'female'} onPress={() => setSex('female')} style={{ flex: 1 }} />
          </View>
        </View>
      </Window>
      <Window title="ACTIVITY (OPTIONAL)">
        <View style={{ gap: sp.s }}>
          {ACTIVITIES.map((act) => (
            <BevelButton
              key={act}
              title={ACTIVITY_LABELS[act].toUpperCase()}
              small
              active={activity === act}
              onPress={() => setActivity((cur) => (cur === act ? undefined : act))}
            />
          ))}
          <Text style={dim}>SKIP = SEDENTARY</Text>
        </View>
      </Window>
      <BevelButton title="FINISH SETUP" disabled={!valid} onPress={finish} />
    </Screen>
  );
}
```

- [ ] **Step 5: `app/log-in.tsx`**:

```tsx
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
    // status flip re-renders the app stack; no navigation needed.
  };

  return (
    <Screen>
      <Window title="LOG IN">
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
```

- [ ] **Step 6: `app/forgot-password.tsx`**:

```tsx
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
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
    // signed in on success; status flip renders the app.
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
```

- [ ] **Step 7: Typecheck + web smoke**
Run: `npx tsc --noEmit` → clean. Restart metro. On web (fresh): Welcome shows **SIGN UP** → account form → onboarding → app (tabs) with computed goals visible on Diary/SYS.

- [ ] **Step 8: Commit**
```bash
git add app/index.tsx app/welcome.tsx app/sign-up.tsx app/onboarding.tsx app/log-in.tsx app/forgot-password.tsx
git commit -m "feat: welcome, sign-up, onboarding, log-in, forgot-password screens"
```

---

### Task 6: SYS profile + sign out

**Files:**
- Modify: `app/(tabs)/settings.tsx`

**Interfaces consumed:** `useAuthStore().logOut` (Task 3); `ACTIVITY_LABELS`, `Activity` (Task 1); existing `settingsDao`, `useDbQuery`.

- [ ] **Step 1: Implement** — add a PROFILE window (reads profile keys) and a SIGN OUT button. Insert a self-contained section component into `settings.tsx` and render it (e.g. below the bodyweight section):

```tsx
// add imports at top:
// import { useAuthStore } from '../../src/state/authStore';
// import { Activity, ACTIVITY_LABELS } from '../../src/lib/goals';

function ProfileSection() {
  const logOut = useAuthStore((s) => s.logOut);
  const tick = useAppStore((s) => s.tick);
  const profile = useDbQuery(async (db) => {
    const s = db.settings;
    return {
      weightKg: await s.get('profileWeightKg'),
      heightCm: await s.get('profileHeightCm'),
      age: await s.get('profileAge'),
      sex: await s.get('profileSex'),
      activity: await s.get('profileActivity'),
    };
  }, [tick]);

  const activityLabel =
    profile?.activity && (profile.activity as Activity) in ACTIVITY_LABELS
      ? ACTIVITY_LABELS[profile.activity as Activity]
      : 'Not set';

  return (
    <>
      <Window title="PROFILE">
        {profile ? (
          <View style={{ gap: 2 }}>
            <Text style={dim}>WEIGHT · {profile.weightKg ?? '—'} kg</Text>
            <Text style={dim}>HEIGHT · {profile.heightCm ?? '—'} cm</Text>
            <Text style={dim}>AGE · {profile.age ?? '—'}</Text>
            <Text style={dim}>SEX · {profile.sex ?? '—'}</Text>
            <Text style={dim}>ACTIVITY · {activityLabel}</Text>
            <Text style={[dim, { marginTop: sp.xs }]}>GOALS ABOVE WERE COMPUTED FROM THESE — EDIT ANYTIME.</Text>
          </View>
        ) : (
          <Text style={dim}>NO PROFILE YET</Text>
        )}
      </Window>
      <BevelButton title="SIGN OUT" onPress={() => logOut()} />
    </>
  );
}
```
Render `<ProfileSection />` inside the SYS screen's returned tree (after `<BodyweightSection ... />`). Confirm `View`, `Text`, `dim`, `sp`, `Window`, `BevelButton`, `useDbQuery`, `useAppStore` are imported (they are).

- [ ] **Step 2: Typecheck + web**
Run: `npx tsc --noEmit` → clean. On web: SYS shows PROFILE with the onboarding values; SIGN OUT returns to Welcome (now showing **LOG IN**).

- [ ] **Step 3: Commit**
```bash
git add "app/(tabs)/settings.tsx"
git commit -m "feat: SYS profile summary + sign out"
```

---

### Task 7: Full verification + README + push

- [ ] `npm test` — goals tests + existing suites green. `npx tsc --noEmit` clean. `npx expo install --check` → up to date.
- [ ] Web preview end-to-end (drive via javascript_tool; restart metro; on web, clear `localStorage` first so no stale account: run `localStorage.clear()` in the console, reload):
  1. Welcome shows **SIGN UP** → create account → onboarding (weight/height/age/sex/activity) → **FINISH** → lands in Diary; SYS/Diary show computed kcal + macro goals.
  2. SYS → **SIGN OUT** → Welcome now shows **LOG IN**.
  3. **LOG IN** with the right password → back in app. Wrong password → "INCORRECT USERNAME OR PASSWORD".
  4. Log out → LOG IN → **FORGOT PASSWORD** → correct security answer + new password → signed in, data intact (goals still present).
  5. Reload the page while signed in → stays signed in (session persisted).
- [ ] Update `README.md`: note first-launch onboarding + local account (data + session stay on device).
- [ ] Device caveat in the final report: real Keychain/Keystore + persistence across full app kill must be confirmed on Expo Go (web uses localStorage).
- [ ] Commit `docs: note onboarding + local account in README`; push branch.

---

## Self-review

- **Spec coverage:** goal math → Task 1; credential storage/hashing → Task 2; auth store (signUp/logIn/resetPassword/logOut/refresh) → Task 3; boot gate + single-button welcome → Tasks 4/5; onboarding + goals seeding + manual-override-preserved → Task 5 (writes existing settings keys only); log-in + forgot-password (security question) → Task 5; SYS profile + sign out → Task 6; deps expo-secure-store/expo-crypto → Task 2; testing → Task 1 unit + Task 7 web. ✔
- **Type consistency:** `AccountRecord`, `makeSalt`/`hashSecret`, account fns (Task 2) consumed in Task 3; `AuthStatus`/`useAuthStore` (Task 3) consumed in Tasks 4/5/6; `computeGoals`/`GoalInput`/`Sex`/`Activity`/`ACTIVITY_LABELS` (Task 1) consumed in Task 5/6; settings keys (`kcalGoal`… + `profile*` + `onboardingComplete`) written in Task 5, read in Task 6. ✔
- **Placeholder scan:** all steps carry full code; no TBDs. The one router subtlety (index redirect so tabs don't mount pre-auth) is spelled out in Task 5 Step 1. ✔
- **Ordering caveat:** Task 4 references screen files created in Task 5 — noted in Task 4 Step 2 that the app isn't runnable until Task 5; both commit independently and typecheck holds. ✔
