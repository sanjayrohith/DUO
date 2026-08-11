#pragma once

#include <Arduino.h>

#include "config.h"

enum class TrackState { IDLE, FOUND, TRACKING, LOST };

// Proportional pan/tilt controller for the person-tracking gimbal.
//
// error = personX - CENTER_X
// abs(error) < DEAD_ZONE  -> hold (no movement)
// else                    -> panAngle = clamp(KP * error, +/-PAN_LIMIT_DEG)
//
// Tilt holds center in v1 (documented limitation — see firmware/README.md).
//
// State machine: IDLE (no tracking data yet) -> FOUND (first person seen,
// same frame as TRACKING) -> TRACKING (following) -> LOST (no person, or
// LOST_TIMEOUT_MS of message silence) -> eases back toward center, then
// returns to IDLE once centered.
class TrackingController {
public:
    TrackingController() : state_(TrackState::IDLE), panAngle_(0.0f), tiltAngle_(0.0f), lastMessageMs_(0) {}

    // Call with a new normalized person-X reading in [0, 1].
    void onTracking(float personX, unsigned long nowMs) {
        lastMessageMs_ = nowMs;
        float error = personX - CENTER_X;

        if (state_ == TrackState::IDLE || state_ == TrackState::LOST) {
            state_ = TrackState::FOUND;
        } else {
            state_ = TrackState::TRACKING;
        }

        if (fabs(error) < DEAD_ZONE) {
            // Inside the dead zone: hold current angle.
            return;
        }

        float command = KP * error;
        panAngle_ = clampAngle(command, PAN_LIMIT_DEG);
        // Tilt holds center in v1.
        tiltAngle_ = 0.0f;
    }

    // Call when the phone explicitly reports LOST.
    void onLost() {
        state_ = TrackState::LOST;
    }

    // Call when the phone sends CENTER.
    void onCenterCommand() {
        panAngle_ = 0.0f;
        tiltAngle_ = 0.0f;
        state_ = TrackState::IDLE;
    }

    // Call every loop iteration to handle the LOST timeout and easing.
    void tick(unsigned long nowMs) {
        if (state_ == TrackState::TRACKING || state_ == TrackState::FOUND) {
            if (nowMs - lastMessageMs_ > LOST_TIMEOUT_MS) {
                state_ = TrackState::LOST;
            }
        }

        if (state_ == TrackState::LOST) {
            easeTowardCenter();
        }
    }

    TrackState state() const { return state_; }
    float panAngle() const { return panAngle_; }
    float tiltAngle() const { return tiltAngle_; }

private:
    static float clampAngle(float angle, float limit) {
        if (angle > limit) return limit;
        if (angle < -limit) return -limit;
        return angle;
    }

    void easeTowardCenter() {
        const float step = 2.0f;  // degrees per tick; tune alongside KP (Task 6.6)
        if (fabs(panAngle_) <= step) {
            panAngle_ = 0.0f;
            state_ = TrackState::IDLE;
        } else {
            panAngle_ -= (panAngle_ > 0 ? step : -step);
        }
        tiltAngle_ = 0.0f;
    }

    TrackState state_;
    float panAngle_;
    float tiltAngle_;
    unsigned long lastMessageMs_;
};
