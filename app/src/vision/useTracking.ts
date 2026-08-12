import { useEffect, useRef, useState } from "react";

import { ESPSocket } from "../transport/espSocket";
import { BoundingBox, PersonTracker } from "./personTracking";

export type TrackingUiState = "idle" | "tracking" | "lost";

// Wires PersonTracker's smoothed X output to the ESP32 WebSocket and exposes
// a small UI state for the tracking indicator. Call `reportFrame` from the
// vision-camera frame processor's JS callback (Task 8.1's detector path)
// once per processed frame.
export function useTracking(espSocket: ESPSocket | null) {
  const [uiState, setUiState] = useState<TrackingUiState>("idle");
  const trackerRef = useRef<PersonTracker | null>(null);

  useEffect(() => {
    trackerRef.current = new PersonTracker(
      ({ x }) => {
        setUiState("tracking");
        espSocket?.sendX(x);
      },
      () => {
        setUiState("lost");
        espSocket?.sendLost();
      }
    );
    return () => {
      trackerRef.current = null;
    };
  }, [espSocket]);

  const reportFrame = (boxes: BoundingBox[], frameWidth: number) => {
    trackerRef.current?.onFrame(boxes, frameWidth, Date.now());
  };

  return { uiState, reportFrame };
}
