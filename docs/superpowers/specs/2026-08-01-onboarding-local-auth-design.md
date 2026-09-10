# Onboarding + local account auth — Design Spec

Date: 2026-08-01
Status: Approved

## Context

PIKE TRACKER is a local-first, offline Expo app (SDK 54) with no backend. Two additions:

1. **First-launch onboarding** — collect body stats and compute starting calorie + macro goals, while keeping the existing manual per-nutrient override.
2. **Local account auth** — a Sign Up / Log In gate with a session that persists across app restarts. Purely on-device; no server.

The app stays offline and Expo-Go-compatible (so it ships to the App/Play stores via EAS Build with no Mac and no native-module workflow change).

## Decisions (locked)

- **Auth is local, on-device.** No backend. One user per device — login is a lock on the single dataset, not multi-user partitioning.
- **Welcome screen shows exactly one button**, chosen by whether an account exists: no account → **SIGN UP** only; account exists (signed out) → **LOG IN** only.
- **Onboarding collects** weight (kg/lb), height (cm), age, sex, activity (optional).
- **Goals** via Mifflin–St Jeor BMR × activity → TDEE (calorie goal); 30/40/30 macro split → gram goals. Seeds the existing `kcalGoal/proteinGoal/carbsGoal/fatGoal` settings; manual editing on the SYS screen is unchanged.
- **Passwords**: salted, iterated SHA-256 via `expo-crypto`. Never stored plaintext.
- **Forgot password**: security question + hashed answer (local); correct answer → set new password, keep all data.
- **Fitness data stays in SQLite** unencrypted (relies on OS at-rest device encryption + sandbox isolation). Credentials + session live in `expo-secure-store` (Keychain/Keystore). No DB encryption (SQLCipher rejected — would break Expo Go).

## Storage split

| | Fitness/app data | Credentials + session |
|---|---|---|
| Store | SQLite `pike.db` (expo-sqlite) | `expo-secure-store` |
| Keys | existing tables + `settings` (goals, profile) | `pike.account`, `pike.session` |

**`pike.account`** (JSON string, persists until account reset):
```ts
interface AccountRecord {
  username: string;
  salt: string;            // hex, random per account
  passwordHash: string;    // hex, saltedIteratedSha256(password, salt)
  securityQuestion: string;
  securityAnswerHash: string; // hex, saltedIteratedSha256(lowercased-trimmed answer, salt)
}
```
**`pike.session`** = `'1'` when signed in; deleted on sign out. Presence = active session (persists across restarts).

Profile stats live in the `settings` table (app data, not secret) under keys: `profileWeightKg`, `profileHeightCm`, `profileAge`, `profileSex`, `profileActivity`, plus `onboardingComplete='1'`.

## Goal math — `src/lib/goals.ts` (pure, TDD)

```ts
type Sex = 'male' | 'female';
type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

// Mifflin–St Jeor
bmrMifflin(weightKg, heightCm, age, sex): number
  = 10*weightKg + 6.25*heightCm - 5*age + (sex === 'male' ? 5 : -161)

const ACTIVITY_FACTOR = { sedentary:1.2, light:1.375, moderate:1.55, active:1.725, very_active:1.9 };
tdee(bmr, activity): number = bmr * ACTIVITY_FACTOR[activity]   // activity undefined → 'sedentary'

// 30% protein / 40% carbs / 30% fat of kcal; 4/4/9 kcal per gram
macroGoals(kcal): { protein:number; carbs:number; fat:number }
  = { protein: round(kcal*0.30/4), carbs: round(kcal*0.40/4), fat: round(kcal*0.30/9) }

computeGoals(input: { weightKg; heightCm; age; sex; activity? }):
  { kcal:number; protein:number; carbs:number; fat:number }   // kcal rounded to whole
```
No React/RN imports; unit-tested (male/female BMR, each activity factor, macro grams, rounding, activity default).

## Auth service — `src/auth/`

`src/auth/crypto.ts` (uses expo-crypto; not in `src/lib`):
- `makeSalt(): Promise<string>` — 16 random bytes hex (`Crypto.getRandomBytesAsync`).
- `hashSecret(secret: string, salt: string): Promise<string>` — SHA-256 of `salt+secret`, iterated (e.g. 5000 rounds, re-hashing hex) → hex.

`src/auth/account.ts` (uses expo-secure-store):
- `loadAccount(): Promise<AccountRecord | undefined>`
- `saveAccount(a: AccountRecord): Promise<void>`
- `hasAccount(): Promise<boolean>`
- `deleteAccount(): Promise<void>`
- `isSignedIn(): Promise<boolean>` / `setSignedIn(v: boolean): Promise<void>` (`pike.session`)

`src/state/authStore.ts` (zustand):
- `status: 'loading' | 'signedOut' | 'signedIn'`, `hasAccount: boolean`.
- `refresh()` — reads secure-store, sets status/hasAccount (called at boot).
- `signUp(username, password, securityQuestion, securityAnswer)` — makeSalt, hash password + answer, saveAccount, setSignedIn(true), status='signedIn'. (Onboarding writes goals separately after.)
- `logIn(username, password)` — loadAccount, compare username + hashSecret(password) to stored; on match setSignedIn(true), status='signedIn'; else throw/return false.
- `resetPassword(answer, newPassword)` — verify hashSecret(answer) vs stored securityAnswerHash; on match re-hash newPassword, saveAccount, setSignedIn(true).
- `logOut()` — setSignedIn(false), status='signedOut'.

Web note: expo-secure-store falls back to localStorage and expo-crypto uses WebCrypto — the full flow runs in the web preview (localStorage persists across reloads, so tests clear it explicitly).

## Navigation / gate — `app/_layout.tsx`

After `initDb()` (existing), also `authStore.refresh()`. Render by `status`:
- `loading` → existing BOOTING screen.
- `signedOut` → **Auth stack**: `welcome` (initial), `sign-up`, `onboarding`, `log-in`, `forgot-password`.
- `signedIn` → **App stack**: the current `(tabs)` + all existing modals.

Switching stacks is driven by `status` flips (not cross-stack router pushes). New route files:

- `app/welcome.tsx` — logo; one `BevelButton`: `hasAccount ? 'LOG IN' → /log-in : 'SIGN UP' → /sign-up`.
- `app/sign-up.tsx` — username, password, confirm-password, security question (free text or a small preset picker), security answer. Validates (non-empty, password === confirm, min length 4). On submit → `authStore.signUp(...)` then `router.replace('/onboarding')`.
- `app/onboarding.tsx` — weight (+ kg/lb toggle, stored canonical kg), height (cm), age, sex (Male/Female), activity (5 options, optional/skippable). On finish → `computeGoals`, write goals + profile into `settings` via `settingsDao`, set `onboardingComplete='1'`, `bump()`. `status` is already `signedIn` (from signUp) → root renders the app.
- `app/log-in.tsx` — username, password → `authStore.logIn`; on fail show "INCORRECT USERNAME OR PASSWORD"; link "FORGOT PASSWORD" → `/forgot-password`.
- `app/forgot-password.tsx` — shows the stored security question; answer + new password + confirm → `authStore.resetPassword`; on success signed in → app; on wrong answer show message.

## SYS screen additions — `app/(tabs)/settings.tsx`

- A **PROFILE** window showing username + the stored stats (weight/height/age/sex/activity) read from settings; note goals were computed from these and can be edited above.
- A **SIGN OUT** `BevelButton` → `authStore.logOut()` (→ Welcome shows LOG IN).
- Existing goal editing unchanged.

## Error handling

- Sign-up validation: empty fields, password mismatch, too-short password → inline messages; no write until valid.
- Log-in / reset failures → explicit inline message, no lockout counter (local convenience gate).
- Secure-store / crypto errors → surfaced as a boot/auth error message, not a silent failure.
- Onboarding numeric validation: weight/height/age must be positive finite numbers before FINISH enables.

## Testing

- Unit (jest, no RN): `src/lib/goals.ts` — BMR both sexes, all five activity factors, macro grams, rounding, activity default to sedentary.
- Auth crypto/secure-store are native-backed but run on web; verified in the web preview end-to-end: SIGN UP → onboarding → goals appear in SYS → SIGN OUT → Welcome shows LOG IN → LOG IN → back in app; wrong password rejected; forgot-password via security question resets and keeps data.
- Not device-verified here: real Keychain/Keystore behavior (web uses localStorage) — confirm on Expo Go.

## Dependencies

- `expo-secure-store`, `expo-crypto` — both Expo modules, Expo-Go-compatible, pinned via `npx expo install`. No native workflow change; still ships via EAS Build.

## Out of scope

Cross-device sync / real backend accounts, email-based reset, biometric unlock, multiple profiles per device, at-rest DB encryption (SQLCipher), password strength meters beyond a minimum length.
