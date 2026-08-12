// Person tracking: turns raw per-frame detections into a normalized,
// smoothed, ~10Hz X stream for the ESP32 gimbal (see docs/PROTOCOL.md).
//
// Deliberately decoupled from the specific on-device detector (frame
// processor plugin) — it consumes plain bounding boxes, however they were
// produced. See app/README.md "Computer vision path" for which detector
// library feeds this and why; that choice needs on-device fps verification
// (Task 8.1) that hasn't been done in this environment.

export interface BoundingBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface TrackingEvent {
  x: number; // normalized [0, 1], smoothed
}

const EMIT_INTERVAL_MS = 100; // ~10Hz, matches docs/PROTOCOL.md
const LOST_AFTER_MS = 500; // no detection for this long => emit LOST
const LOW_PASS_ALPHA = 0.35; // higher = more responsive, lower = smoother

export class PersonTracker {
  private smoothedX: number | null = null;
  private lastDetectionAt = 0;
  private lastEmitAt = 0;

  constructor(
    private onTracking: (event: TrackingEvent) => void,
    private onLost: () => void
  ) {}

  // Call once per processed frame with the detected boxes (empty if none),
  // plus the frame width used to normalize box coordinates. Boxes are
  // expected in the same pixel space as frameWidth.
  onFrame(boxes: BoundingBox[], frameWidth: number, nowMs: number): void {
    const largest = pickLargest(boxes);

    if (largest) {
      const rawX = (largest.left + largest.right) / 2 / frameWidth;
      const clamped = Math.min(1, Math.max(0, rawX));
      this.smoothedX =
        this.smoothedX === null
          ? clamped
          : this.smoothedX + LOW_PASS_ALPHA * (clamped - this.smoothedX);
      this.lastDetectionAt = nowMs;
    }

    const sinceDetection = nowMs - this.lastDetectionAt;
    const sinceEmit = nowMs - this.lastEmitAt;
    if (sinceEmit < EMIT_INTERVAL_MS) return;
    this.lastEmitAt = nowMs;

    if (this.smoothedX === null || sinceDetection > LOST_AFTER_MS) {
      this.onLost();
      return;
    }

    this.onTracking({ x: this.smoothedX });
  }

  reset(): void {
    this.smoothedX = null;
    this.lastDetectionAt = 0;
    this.lastEmitAt = 0;
  }
}

function pickLargest(boxes: BoundingBox[]): BoundingBox | null {
  if (boxes.length === 0) return null;
  return boxes.reduce((largest, box) => (area(box) > area(largest) ? box : largest));
}

function area(box: BoundingBox): number {
  return Math.max(0, box.right - box.left) * Math.max(0, box.bottom - box.top);
}
