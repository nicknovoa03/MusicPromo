# MusicPromo

React Native + Expo app.

## Run On Mobile (Expo Go)

From the project directory, run:

```bash
npx expo start --tunnel
```

Then scan the QR code in the terminal with Expo Go.

## iOS TestFlight

Use the release checklist at `docs/release/testflight-checklist.md`.

## Bundle Analysis (Expo Atlas)

Generate and inspect an iOS production bundle report:

```bash
npm run atlas:ios
```

You can also run each step separately:

```bash
npm run atlas:export:ios
npm run atlas:open
```
