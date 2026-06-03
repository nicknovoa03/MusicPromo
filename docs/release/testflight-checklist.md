# iOS EAS + TestFlight Checklist

This project uses Expo Continuous Native Generation (CNG). `ios/` and `android/` are generated and git-ignored, so `app.json` + `eas.json` are the source of truth.

**v1 launch scope:** Music Promo only on iOS. See [App Store v1 — Launch Scope](./app-store-v1-launch-scope.md).

## 1) One-time setup

1. Log in to Expo and Apple:
   - `npx eas login`
   - `npx eas whoami`
2. Confirm the app exists in App Store Connect with bundle ID `com.musicpromo.app`.
3. If EAS credentials are not configured yet, run:
   - `npx eas credentials -p ios`
4. Ensure Apple capabilities are enabled for the App ID:
   - Push Notifications

## 2) Current release config (verified)

1. Bundle ID: `com.musicpromo.app`
2. Version: `1.0.0` (`expo.version`)
3. Build number source: EAS remote + auto-increment in production (`eas.json`)
4. Runtime version policy: `appVersion`
5. Updates URL: `https://u.expo.dev/7aca913d-9634-4d4a-b76e-edfc31229af9`
6. Notifications APNs mode: `production`
7. iOS background remote notifications: enabled via `expo-notifications` plugin

## 3) Preflight before each build

1. Confirm launch scope for the profile you are building:
   - **preview** / **production** → `EXPO_PUBLIC_LAUNCH_SCOPE=music-promo-only` in `eas.json`
   - After install: **Create** must open photo/audio picker (not the 3-card type picker)
2. Validate config:
   - `npx expo config --type introspect`
2. Confirm the app version in `app.json`:
   - Bump `expo.version` when making a new store-facing release.
3. Run type checks:
   - `npm run lint:all`
4. Confirm required assets:
   - `assets/icon.png` is 1024x1024
   - `assets/splash-icon.png` exists and looks correct on device
5. Confirm iOS privacy usage text is accurate:
   - Photo library read/write
   - Microphone
   - Camera

## 4) Build and submit

1. Internal QA build:
   - `npx eas build -p ios --profile preview`
2. TestFlight/App Store build:
   - `npx eas build -p ios --profile production`
3. Submit latest iOS build to TestFlight:
   - `npx eas submit -p ios --profile production`
   - Optional in one step: `npx eas build -p ios --profile production --auto-submit`

## 5) App Store Connect checks

1. Complete TestFlight build information:
   - What to test
   - Contact email
   - Demo account credentials (if login is required)
2. Verify compliance answers:
   - Export compliance (encryption)
   - Content rights
3. Confirm App Privacy / data collection answers are current.
4. Add or refresh screenshots for required iPhone sizes.
5. Start with Internal Testers, then expand to External Testers.

## 6) Common gotchas

1. If Create still shows Song Press Kit / Event Flyer, the installed build predates launch-scope gating or was built with `EXPO_PUBLIC_LAUNCH_SCOPE=full`. Rebuild with preview/production profile. See [launch scope doc](./app-store-v1-launch-scope.md).
2. If push token registration fails on TestFlight, verify:
   - Push Notifications capability is enabled for the App ID
   - Build was created with production APNs entitlements
3. If OTA updates do not apply, verify:
   - `runtimeVersion` matches installed app version policy
   - Update was published to the expected channel
4. If EAS asks to regenerate credentials, allow EAS to manage iOS credentials unless you need manual cert/profile control.
