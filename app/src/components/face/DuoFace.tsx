import React, { forwardRef, useImperativeHandle } from "react";
import { Canvas, Circle, Group, Path, Skia } from "@shopify/react-native-skia";
import { Easing, useDerivedValue, useSharedValue, withTiming } from "react-native-reanimated";

// Mirrors the server's FaceState enum (duo_server/games/state.py) — keep in
// sync manually, there is no shared codegen between app and server.
export type FaceState =
  | "idle"
  | "curious"
  | "happy"
  | "excited"
  | "focused"
  | "encouraging"
  | "surprised"
  | "failure"
  | "success";

export interface DuoFaceHandle {
  setFaceState: (state: FaceState) => void;
}

interface FaceParams {
  eyeScale: number; // multiplier on base eye radius: squinted (<1) to wide (>1)
  mouthCurve: number; // -1 (frown) to 1 (big smile), 0 = neutral
}

const FACE_PARAMS: Record<FaceState, FaceParams> = {
  idle: { eyeScale: 0.7, mouthCurve: 0.1 },
  curious: { eyeScale: 0.9, mouthCurve: 0.15 },
  happy: { eyeScale: 0.6, mouthCurve: 0.6 },
  excited: { eyeScale: 1.0, mouthCurve: 0.9 },
  focused: { eyeScale: 0.5, mouthCurve: 0.0 },
  encouraging: { eyeScale: 0.75, mouthCurve: 0.4 },
  surprised: { eyeScale: 1.25, mouthCurve: 0.3 },
  failure: { eyeScale: 0.6, mouthCurve: -0.5 },
  success: { eyeScale: 1.0, mouthCurve: 0.8 },
};

const TRANSITION_MS = 300;
const CANVAS_SIZE = 240;
const EYE_BASE_RADIUS = 18;
const EYE_Y = CANVAS_SIZE * 0.42;
const EYE_SPACING = 44;
const MOUTH_Y = CANVAS_SIZE * 0.65;
const MOUTH_HALF_WIDTH = 40;
const CENTER_X = CANVAS_SIZE / 2;

export const DuoFace = forwardRef<DuoFaceHandle>((_props, ref) => {
  const eyeScale = useSharedValue(FACE_PARAMS.idle.eyeScale);
  const mouthCurve = useSharedValue(FACE_PARAMS.idle.mouthCurve);

  useImperativeHandle(
    ref,
    () => ({
      setFaceState: (state: FaceState) => {
        const params = FACE_PARAMS[state];
        const timing = { duration: TRANSITION_MS, easing: Easing.out(Easing.quad) };
        eyeScale.value = withTiming(params.eyeScale, timing);
        mouthCurve.value = withTiming(params.mouthCurve, timing);
      },
    }),
    [eyeScale, mouthCurve]
  );

  const eyeRadius = useDerivedValue(() => EYE_BASE_RADIUS * eyeScale.value);

  const mouthPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const left = CENTER_X - MOUTH_HALF_WIDTH;
    const right = CENTER_X + MOUTH_HALF_WIDTH;
    const curveY = MOUTH_Y - mouthCurve.value * 30;
    path.moveTo(left, MOUTH_Y);
    path.quadTo(CENTER_X, curveY, right, MOUTH_Y);
    return path;
  });

  return (
    <Canvas style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
      <Group>
        <Circle cx={CENTER_X - EYE_SPACING} cy={EYE_Y} r={eyeRadius} color="#1a1a2e" />
        <Circle cx={CENTER_X + EYE_SPACING} cy={EYE_Y} r={eyeRadius} color="#1a1a2e" />
        <Path path={mouthPath} color="#1a1a2e" style="stroke" strokeWidth={6} strokeCap="round" />
      </Group>
    </Canvas>
  );
});

DuoFace.displayName = "DuoFace";
