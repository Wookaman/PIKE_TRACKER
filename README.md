# PIKE TRACKER

`C:\> EAT. LIFT. LOG. REPEAT._`

Minimalist fitness tracker with a dark, monochrome, Windows-XP-flavored UI.
Built with Expo / React Native — runs on iPhone, Android, and the web.

## Features

- **First-launch setup** — a local, on-device account (Sign Up / Log In, no
  server); session persists across restarts. Onboarding collects weight,
  height, age, sex, and activity, then computes starting calorie + macro
  goals (Mifflin–St Jeor) that you can still adjust manually. Forgotten
  passwords recover via a local security question. Credentials are stored
  hashed in the device keychain; fitness data stays in on-device SQLite.
- **Calorie diary** — log foods per day, browse past and future days, log in
  advance. ~180 seeded common foods with real per-100g macros, grams / oz /
  per-food servings ("1 slice", "1 cup"), custom foods, and online search via
  Open Food Facts (results cached locally).
- **Barcode scanning** — scan a product barcode with the phone camera
  (Open Food Facts lookup) to log it instantly; an expandable NUTRIENTS
  section shows the micronutrient breakdown (saturated fat, salt, vitamins,
  minerals…) per 100 g.
- **Recipes** — build recipes from ingredients, get per-serving macros, log by
  servings.
- **Workout log** — same daily calendar, ~70 seeded exercises with muscle
  maps, custom exercises with manual muscle selection, sets × reps × weight
  (or duration for cardio).
- **Muscle figure** — low-poly front/back body on the workout tab; muscles
  worked that day light up white (primary) and grey (secondary).
- **Daily targets** — calorie goal with segmented XP-style progress bar,
  optional protein/carb/fat goals, kg/lb setting.

Everything is stored locally in SQLite on the device. No account, no cloud.

## Run it

```bash
npm install
npx expo start
```

- **iPhone**: install [Expo Go](https://apps.apple.com/app/expo-go/id982107779),
  scan the QR code from the terminal (same Wi-Fi network).
- **Web preview**: press `w` (uses a fresh in-browser database per page load).
- **Ship to the App Store later**: `eas build` (cloud builds work from Windows,
  no Mac needed).

## Development

```bash
npm test            # jest — domain logic, DAOs (real SQLite), seed data
npm run typecheck   # tsc --noEmit
```

Architecture notes live in `docs/superpowers/specs/` and
`docs/superpowers/plans/`.
