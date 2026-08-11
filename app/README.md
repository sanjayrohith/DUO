# DUO Phone App

React Native / Expo app: the phone is DUO's head (camera, computer vision,
face animation, game UI, audio).

## Versions (recorded 2026-08-11, at scaffold time)

- **Expo SDK 57** (`expo@~57.0.12`) — current stable at the time this was
  scaffolded (`npm view expo dist-tags` → `latest: 57.0.12`).
- **React Native 0.86.2**
- **React 19.2.3**
- TypeScript 6.0.3 (`~6.0.3`)

SDK 54 was the last release with Legacy Architecture support — SDK 57 runs
the New Architecture by default. Re-check these versions before a real build;
Expo ships new SDKs roughly quarterly and this file can drift.

## Expo Go limitation

**Expo Go cannot run `react-native-vision-camera` frame processors or BLE.**
Camera-based person/hand tracking (Phase 8) and any future BLE fallback need
a **development build** instead — a custom build of the app with native
modules compiled in, installed like a normal app. Plan all camera work
against a dev client from the start; don't prototype it in Expo Go and expect
it to carry over.

## Setup

Dependencies are not installed yet in this repo (no `node_modules/`,
intentionally — see Phase 7 status in `PLAN.md`). To install:

```bash
cd app
npm install
```

## Development build

Building a dev client needs either a local native prebuild or an EAS Build.
Both are configured in `app.json` / `eas.json` (Task 7.2). `app.json` already
declares the `react-native-vision-camera` config plugin and camera usage
strings (iOS `NSCameraUsageDescription`, Android `CAMERA` permission) ahead
of Phase 8 — **the plugin config is in place, but the `react-native-vision-camera`
package itself is not installed yet** (that's Task 8.1). `expo prebuild` will
fail on the plugin reference until that package is added as a dependency. A
BLE config plugin is deferred until BLE is actually needed (documented as a
no-Wi-Fi fallback only, out of scope for the current phases).

```bash
# Local prebuild (generates ios/ and android/ native projects)
npx expo prebuild

# Or, cloud build via EAS
eas build --profile development --platform android
eas build --profile development --platform ios
```

Once installed on a device, `npx expo start --dev-client` connects to it —
`npx expo start` alone launches Expo Go, which will not run this app's
camera/BLE features.

## Status

Scaffolded (Task 7.1) with `create-expo-app`'s `blank-typescript` template,
then adapted: name/slug set to `DUO`/`duo`, default assets moved to
`assets/images/`. Screens, components, and the transport/vision layers listed
in the repo structure are not yet implemented — later Phase 7 tasks and
Phase 8/9 fill those in.

**Not yet verified**: `npm install` has not been run in this environment
(no reason to expect it to fail — the scaffold is from `create-expo-app`
unmodified — but it hasn't been executed here), and nothing has been run on
a physical device or simulator. Task 7.7's on-device verification is
therefore still outstanding.
