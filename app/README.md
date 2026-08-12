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

## Face rendering (Skia + Reanimated)

`src/components/face/DuoFace.tsx` renders the nine face states (mirroring the
server's `FaceState` enum in `duo_server/games/state.py`) as a Skia canvas —
two eyes and a mouth curve — driven by Reanimated shared values. Call
`setFaceState(state)` via a ref to transition (`withTiming`, 300ms).

Versions installed (2026-08-11, checked against SDK 57 / RN 0.86.2 compat):

- `@shopify/react-native-skia@^2.11.0` — requires `react-native-reanimated>=4.0.0` and `react-native-worklets>=0.7.0`.
- `react-native-reanimated@^4.5.3` — requires RN `0.83-0.86` (RN 0.86.2 fits) and `react-native-worklets` `0.10.x-0.11.x`.
- `react-native-worklets@^0.11.3`.
- `babel.config.js` adds the `react-native-worklets/plugin` Babel plugin (required by both Reanimated v4 and Skia; must be the last plugin in the list).

Reanimated v4 requires the New Architecture, which SDK 57 uses by default, so
no extra New Architecture opt-in is needed.

## Computer vision path (Phase 8)

`react-native-vision-camera` (v5.2.2) provides camera frames and frame
processors. For the on-device detector that turns frames into person/hand
positions, this repo picked **`react-native-fast-tflite`** (v3.0.1) over the
MediaPipe-plugin alternative (`react-native-mediapipe`), because fast-tflite
is built on Nitro Modules by the same author as vision-camera 5.x, so its
native module generation matches vision-camera's current architecture.
`react-native-mediapipe` was last published about a year before this decision
and depends on the older `react-native-worklets-core` package rather than
vision-camera 5.x's Nitro-based worklets — a real compatibility risk that
hasn't been tested.

**This choice is unverified** — Task 8.1 calls for standing up a minimal
frame-processor screen on a real phone and confirming a usable detection rate
(10-15 fps target) before committing to a detector. That hasn't been done in
this environment (no physical device). Using `react-native-fast-tflite` also
requires sourcing a pose/hand-landmark `.tflite` model file (e.g. a converted
MediaPipe BlazePose/BlazeHand model) and writing the tensor-decoding glue
that turns its raw output into the `BoundingBox`/`HandPoint` shapes below —
neither is done yet.

To keep the parts that *can* be written and reasoned about without hardware
correct and testable, `src/vision/personTracking.ts` and
`src/vision/handTracking.ts` are **detector-agnostic**: they consume plain
bounding boxes / landmark points (whatever shape the eventual frame processor
plugin emits, adapted at the call site) rather than importing
`react-native-fast-tflite` directly. This means:

- The normalization, low-pass filtering, LOST-timeout, and largest-bbox
  selection logic in `personTracking.ts` is real, deterministic code —
  independent of which detector library ends up feeding it.
- The reach-zone mapping in `handTracking.ts` and calibration capture in
  `calibration.ts` are likewise detector-independent.
- Only the frame-processor wiring itself (Task 8.1's actual detector
  integration, decoding `.tflite` output into these shapes) remains to be
  written once a model file and a device are available.

`src/vision/useCameraAvailability.ts` wraps vision-camera's permission and
device-presence hooks into one status (`checking` / `ready` /
`permission_denied` / `no_device`), so camera-dependent games have a single
"camera unavailable" state to fall back on (Task 8.6).

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
