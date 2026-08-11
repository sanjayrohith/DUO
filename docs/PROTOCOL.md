# Phone <-> ESP32-C6 Protocol

Transport: WebSocket over Wi-Fi (primary). All three devices — phone, brain
server, ESP32-C6 — share one LAN. WebSocket gives an ordered, reliable,
full-duplex channel that plain JavaScript opens with no native module, which
fits the roughly 10 Hz tracking stream and lets the ESP32 send telemetry back
without polling.

UDP with absolute-position messages is a documented lower-latency alternative:
a dropped 10 Hz packet is superseded 100 ms later, so loss is self-healing
when messages carry absolute positions rather than deltas. Not implemented in
this phase.

BLE is a no-Wi-Fi fallback only — on the ESP32-C6 the BLE path (NimBLE, no
Bluedroid) is the least mature option and is out of scope here.

The ESP32 runs the WebSocket server; the phone connects as a client to
`ws://<esp32-ip>:81/` (port is configurable in `firmware/duo_firmware/config.h`).

## Phone -> ESP32 (roughly 10 Hz)

Plain-text, comma-separated messages, one per line/frame:

```
TRACKING,X:0.52      # person present, normalized bbox center X in [0,1]
X:0.52                # shorthand form, equivalent to TRACKING,X:0.52
LOST                  # no person detected
CENTER                # command: return to center
PING                  # keepalive
```

`X` is the normalized horizontal center of the nearest/largest detected
person's bounding box: `0.0` is far left, `1.0` is far right, `0.5` is
centered in frame. Both the full `TRACKING,X:` form and the shorthand `X:`
form are accepted, to match the existing head-tracking spec.

## ESP32 -> Phone (optional telemetry)

```
STATE,IDLE|FOUND|TRACKING|LOST
ANGLE,pan:12,tilt:-4
```

`STATE` reports the tracking state machine's current state (see
`firmware/duo_firmware/tracking.h`). `ANGLE` reports the current servo angles
in degrees, relative to center (`0,0`).

## Controller behavior (for context, detailed in `tracking.h`)

- `error = personX - 0.50`
- If `abs(error) < 0.10` (dead zone): hold position.
- Else: `servoCommand = KP * error`, clamped to the pan/tilt limits.
- On `LOST` or 1500 ms of message silence: ease back to center (`0.50`).

## Message framing

One message per WebSocket text frame. No trailing newline required. Unknown
or malformed messages are ignored by the firmware rather than causing a
disconnect.
