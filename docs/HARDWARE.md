# Hardware Bill of Materials

DUO's hardware: a smartphone as the head (camera, audio, face animation,
game UI, computer vision), a 2-axis servo gimbal for physical attention, an
ESP32-C6 for motion, and a mobile base.

| Part | Qty | Notes / Link |
| --- | --- | --- |
| Smartphone (the head) | 1 | Camera, audio, face animation, game UI, on-device CV. Needs a dev build — see `app/README.md`. <!-- TODO: link specific model used --> |
| MG90S micro servo | 2 | Pan (~±40–90°) and tilt (~±30°). <!-- TODO: link --> |
| Pan/tilt servo bracket | 1 | Mounts both MG90S servos for the gimbal. <!-- TODO: link --> |
| ESP32-C6 (Glyph-C6) | 1 | Motion controller — Wi-Fi, drives the gimbal, runs `firmware/duo_firmware`. <!-- TODO: link --> |
| Ultrasonic sensor | 1 | <!-- TODO: model, mounting notes, link --> |
| Motion sensor | 1 | <!-- TODO: model, mounting notes, link --> |
| PVC pipe | — | Body/frame material. <!-- TODO: dimensions, link --> |
| LEGO Inventor set | 1 | Mobile base (remote-controlled; base movement is hardware-only, out of this repo's software scope). <!-- TODO: link --> |
| Wiring / connectors | — | <!-- TODO: gauge, connector types, link --> |
| Power (battery/supply) | — | <!-- TODO: battery spec, runtime, link --> |

This table is a placeholder skeleton — part links, exact models, and
mounting notes are marked `TODO` pending the hardware team filling them in
from the built unit. See `docs/PROTOCOL.md` for how the phone and ESP32-C6
communicate, and `firmware/README.md` for firmware setup.
