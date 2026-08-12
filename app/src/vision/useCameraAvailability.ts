import { useEffect, useState } from "react";
import { useCameraDevice, useCameraPermission } from "react-native-vision-camera";

export type CameraAvailability = "checking" | "ready" | "permission_denied" | "no_device";

// Combines permission state and device presence into one status so screens
// can show a single, clear "camera unavailable" state instead of juggling
// two separate checks. Camera-dependent games should treat anything other
// than "ready" as a reason to fall back to a non-CV interaction mode.
export function useCameraAvailability(): CameraAvailability {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice("front");
  const [status, setStatus] = useState<CameraAvailability>("checking");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!hasPermission) {
        const granted = await requestPermission();
        if (cancelled) return;
        if (!granted) {
          setStatus("permission_denied");
          return;
        }
      }
      setStatus(device ? "ready" : "no_device");
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [hasPermission, device, requestPermission]);

  return status;
}
