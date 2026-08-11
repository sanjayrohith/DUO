// DUO ESP32-C6 firmware: receives phone tracking messages over WebSocket and
// drives the pan/tilt gimbal. See firmware/README.md for board setup,
// required core/library versions, and flashing instructions.
//
// Libraries (verify versions against firmware/README.md before building):
//   - ESP32Async/ESPAsyncWebServer + ESP32Async/AsyncTCP (not the unmaintained
//     me-no-dev originals, which assert on arduino-esp32 core 3.x)
//   - madhephaestus/ESP32Servo

#include <ESPAsyncWebServer.h>
#include <ESP32Servo.h>
#include <WiFi.h>

#include "config.h"
#include "tracking.h"

// WebSocket lives at ws://<esp32-ip>:WEBSOCKET_PORT/ (no separate HTTP port).
AsyncWebServer httpServer(WEBSOCKET_PORT);
AsyncWebSocket ws("/");

Servo panServo;
Servo tiltServo;

TrackingController tracking;

void applyServoAngles() {
    // Servo library expects 0-180; gimbal center is 90.
    int panDeg = 90 + (int)round(tracking.panAngle());
    int tiltDeg = 90 + (int)round(tracking.tiltAngle());
    panServo.write(constrain(panDeg, 90 - PAN_LIMIT_DEG, 90 + PAN_LIMIT_DEG));
    tiltServo.write(constrain(tiltDeg, 90 - TILT_LIMIT_DEG, 90 + TILT_LIMIT_DEG));
}

const char *stateName(TrackState state) {
    switch (state) {
        case TrackState::IDLE: return "IDLE";
        case TrackState::FOUND: return "FOUND";
        case TrackState::TRACKING: return "TRACKING";
        case TrackState::LOST: return "LOST";
    }
    return "UNKNOWN";
}

void sendTelemetry(AsyncWebSocketClient *client) {
    char buf[48];
    snprintf(buf, sizeof(buf), "STATE,%s", stateName(tracking.state()));
    client->text(buf);
    snprintf(buf, sizeof(buf), "ANGLE,pan:%d,tilt:%d", (int)round(tracking.panAngle()), (int)round(tracking.tiltAngle()));
    client->text(buf);
}

void handleMessage(AsyncWebSocketClient *client, const String &msg) {
    unsigned long now = millis();

    if (msg == "LOST") {
        tracking.onLost();
    } else if (msg == "CENTER") {
        tracking.onCenterCommand();
    } else if (msg == "PING") {
        client->text("PONG");
        return;
    } else if (msg.startsWith("TRACKING,X:") || msg.startsWith("X:")) {
        int colonIdx = msg.lastIndexOf(':');
        if (colonIdx < 0) return;  // malformed, ignore rather than disconnect
        float x = msg.substring(colonIdx + 1).toFloat();
        tracking.onTracking(x, now);
    } else {
        return;  // unknown message, ignore per protocol
    }

    applyServoAngles();
    sendTelemetry(client);
}

void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type,
               void *arg, uint8_t *data, size_t len) {
    if (type == WS_EVT_DATA) {
        AwsFrameInfo *info = (AwsFrameInfo *)arg;
        if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
            String msg((char *)data, len);
            handleMessage(client, msg);
        }
    }
}

void setup() {
    Serial.begin(115200);

    panServo.attach(SERVO_PAN_PIN);
    tiltServo.attach(SERVO_TILT_PIN);
    applyServoAngles();  // center both servos on boot

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.print("Connecting to Wi-Fi");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println();
    Serial.print("Connected. IP address: ");
    Serial.println(WiFi.localIP());

    ws.onEvent(onWsEvent);
    httpServer.addHandler(&ws);
    httpServer.begin();
    Serial.printf("WebSocket server listening on port %d\n", WEBSOCKET_PORT);
}

void loop() {
    ws.cleanupClients();
    tracking.tick(millis());
    applyServoAngles();
    delay(20);  // ~50Hz control loop, well above the ~10Hz message rate
}
