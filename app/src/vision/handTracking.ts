// Hand tracking for Air Piano: normalized hand position plus a mapping from
// that position to large key zones, sized to the user's calibrated
// comfortable reach range (see calibration.ts).
//
// Decoupled from the specific hand landmark detector for the same reason as
// personTracking.ts — see app/README.md "Computer vision path".

export interface HandPoint {
  x: number; // normalized [0, 1] in frame space
  y: number; // normalized [0, 1] in frame space
}

export interface ReachRange {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// A single landmark (e.g. index fingertip) is used as the tracked point —
// simpler and steadier for large-target key zones than a full hand centroid.
export function handPointFromLandmarks(
  landmarks: HandPoint[],
  fingertipIndex: number,
  frameWidth: number,
  frameHeight: number
): HandPoint | null {
  const point = landmarks[fingertipIndex];
  if (!point) return null;
  return {
    x: Math.min(1, Math.max(0, point.x / frameWidth)),
    y: Math.min(1, Math.max(0, point.y / frameHeight)),
  };
}

// Maps a normalized hand position to a key index in [0, numKeys), scaled to
// the calibrated reach range. Keys are large equal-width vertical zones
// across the horizontal reach; returns null if the hand is outside the
// calibrated vertical band (so idle hand position doesn't trigger a key).
export function keyIndexForHand(
  hand: HandPoint,
  range: ReachRange,
  numKeys: number
): number | null {
  if (hand.y < range.minY || hand.y > range.maxY) return null;

  const width = range.maxX - range.minX;
  if (width <= 0) return null;

  const relativeX = (hand.x - range.minX) / width;
  if (relativeX < 0 || relativeX > 1) return null;

  const index = Math.floor(relativeX * numKeys);
  return Math.min(numKeys - 1, Math.max(0, index));
}
