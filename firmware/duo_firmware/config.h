#pragma once

// --- Wi-Fi ---
// TODO: fill in before flashing. Do not commit real credentials to a public
// repo; consider moving these to a gitignored secrets.h if the repo goes
// public.
#define WIFI_SSID "your-wifi-ssid"
#define WIFI_PASSWORD "your-wifi-password"

// --- WebSocket server ---
#define WEBSOCKET_PORT 81

// --- Servo GPIO pins ---
// TODO: VERIFY FIRST against the actual Glyph-C6 wiring before flashing.
// These are placeholders (safe, commonly-free GPIOs on ESP32-C6 dev boards)
// and have not been confirmed against this project's hardware.
#define SERVO_PAN_PIN 18
#define SERVO_TILT_PIN 19

// --- Gimbal limits (degrees, relative to center = 0) ---
#define PAN_LIMIT_DEG 40   // approx +/-40-90 degrees per hardware spec; start conservative
#define TILT_LIMIT_DEG 30

// --- Proportional controller ---
// servoCommand = KP * error, where error = personX - CENTER_X (range +/-0.5).
// KP=80 maps the full error range to roughly the pan limit; TODO: tune on
// hardware for smooth, non-jittery motion and record the chosen value (Task 6.6).
#define KP 80.0f
#define DEAD_ZONE 0.10f    // no movement when abs(personX - CENTER_X) < DEAD_ZONE
#define CENTER_X 0.50f

// --- Timing ---
#define LOST_TIMEOUT_MS 1500  // recenter after this long without a tracking message
