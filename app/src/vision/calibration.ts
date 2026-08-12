// Calibration: captures a user's comfortable reach range over a few seconds
// of hand movement, so Catch the Light / Air Piano key zones adapt to the
// individual rather than assuming full-frame reach.

import { getPreferences, setPreference } from "../transport/brainClient";
import { HandPoint, ReachRange } from "./handTracking";

const CALIBRATION_PREFERENCE_KEY = "reach_range";
const DEFAULT_CALIBRATION_MS = 5000;

export class Calibrator {
  private samples: HandPoint[] = [];

  addSample(point: HandPoint): void {
    this.samples.push(point);
  }

  reset(): void {
    this.samples = [];
  }

  // Returns null if no samples were captured (e.g. hand never detected).
  computeRange(): ReachRange | null {
    if (this.samples.length === 0) return null;

    const xs = this.samples.map((p) => p.x);
    const ys = this.samples.map((p) => p.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }
}

export { DEFAULT_CALIBRATION_MS };

export async function saveReachRange(
  baseUrl: string,
  userId: number,
  range: ReachRange
): Promise<void> {
  await setPreference(baseUrl, userId, CALIBRATION_PREFERENCE_KEY, JSON.stringify(range));
}

export async function loadReachRange(baseUrl: string, userId: number): Promise<ReachRange | null> {
  const prefs = await getPreferences(baseUrl, userId);
  const raw = prefs[CALIBRATION_PREFERENCE_KEY];
  if (!raw) return null;
  return JSON.parse(raw) as ReachRange;
}
