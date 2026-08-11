# DUO Firmware (ESP32-C6)

Firmware for the Glyph-C6 (ESP32-C6) controller: receives phone tracking
messages over WebSocket and drives the pan/tilt MG90S gimbal. See
`docs/PROTOCOL.md` for the message format this firmware implements.

## Board selection

Select an ESP32-C6 board in the Arduino IDE board manager (e.g. "ESP32C6 Dev
Module"). Requires **arduino-esp32 core 3.x** (ESP-IDF 5.1+) — the C6 is a
first-class target starting in core 3.x; earlier cores do not support it.

## Required libraries

Install via the Arduino Library Manager or `arduino-cli lib install`:

| Library | Notes |
| --- | --- |
| `ESP32Async/ESPAsyncWebServer` | Use this fork, **not** the unmaintained `me-no-dev/ESPAsyncWebServer`, which asserts on core 3.x with `Required to lock TCPIP core functionality!`. |
| `ESP32Async/AsyncTCP` | Required by the above. Same fork family, not the `me-no-dev` original. |
| `madhephaestus/ESP32Servo` | LEDC-based PWM servo control. |

**TODO (verify first, Task 6.6):** record the exact resolved versions of each
library once installed and building on real hardware, e.g.:

```
ESP32Async/ESPAsyncWebServer @ x.x.x
ESP32Async/AsyncTCP @ x.x.x
madhephaestus/ESP32Servo @ x.x.x
```

### Alternative WebSocket library (not used here)

`Links2004/arduinoWebSockets` is a common alternative but has a known C6
crash: it seeds its RNG from a hardcoded register address (`DR_REG_RNG_BASE`),
which is not valid on the C6. If you switch to this library, verify the fix
is present in your installed version, or patch the seed to use
`randomSeed(esp_random())` instead.

### PlatformIO note

Mainline `espressif32` in PlatformIO lacks Arduino framework support for the
C6 — use the `pioarduino` fork if building with PlatformIO. The Arduino IDE
compiles the C6 directly with no fork needed. `platformio.ini` is not
included in this repo yet; the Arduino IDE is the primary supported path.

## Configuration

Edit `firmware/duo_firmware/config.h` before building:

- `WIFI_SSID` / `WIFI_PASSWORD` — your network credentials. Do not commit real
  credentials if this repo is public; consider a gitignored `secrets.h`.
- `SERVO_PAN_PIN` / `SERVO_TILT_PIN` — **TODO: verify first** against the
  actual Glyph-C6 wiring before flashing. The checked-in values are
  placeholders and have not been confirmed against this project's hardware.
- `KP`, `DEAD_ZONE`, pan/tilt limits, `LOST_TIMEOUT_MS` — controller tuning,
  see `firmware/duo_firmware/tracking.h`. `KP` in particular needs on-hardware
  tuning (Task 6.6) for smooth, non-jittery motion; record the value that
  works here once found.

## Flashing

1. Connect the ESP32-C6 over USB.
2. Select the correct board and port in the Arduino IDE.
3. Open `firmware/duo_firmware/duo_firmware.ino`.
4. Upload.
5. Open the Serial Monitor at 115200 baud. On successful Wi-Fi connection the
   device prints its IP address:

   ```
   Connecting to Wi-Fi.....
   Connected. IP address: 192.168.1.x
   WebSocket server listening on port 81
   ```

   Use that IP for the phone app's ESP32 connection setting
   (`ws://<esp32-ip>:81/`).

## Hardware verification (Task 6.6, not yet performed)

With servos connected, send `TRACKING,X:0.2`, `X:0.8`, and `LOST` from a
WebSocket test client and confirm:

- The pan servo moves within the configured limits.
- Motion respects the dead zone near `X:0.5` (no jitter when centered).
- The gimbal recenters after 1.5 s of message silence.

Record the `KP` value that gives smooth, non-jittery motion, and correct the
`SERVO_PAN_PIN`/`SERVO_TILT_PIN` placeholders in `config.h` against the real
wiring. Neither has been done yet — this firmware has been written and
reviewed but not run on hardware.
