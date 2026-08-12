# Safety

DUO is a general wellness and companionship project. **It is not a medical
device.** It does not diagnose, treat, or prescribe. It complements — and
does not replace — a physiotherapist or clinician.

- Exercises and targets should be set by a qualified professional, not by
  DUO.
- Stop and consult your clinician if you feel pain or unwell during any
  activity.
- DUO supports, encourages, tracks, and plays. It does not diagnose, treat,
  or measure in a clinical sense.

## Why the wording matters

A disclaimer alone does not change what a product is. That's why this
principle runs through the implementation, not just this page: DUO's persona
(`server/duo_server/persona/duo_system_prompt.md`) is instructed to never
give medical advice, diagnoses, or exercise prescriptions, and to defer any
medical question to the user's physiotherapist. The games track effort and
personal bests (a reach percentage, a reaction time, a streak) purely as
internal numbers for celebrating progress — DUO never speaks them back as
clinical measurements.

## Privacy

- Camera frames are processed on-device for tracking and are neither stored
  nor uploaded anywhere.
- The brain (the FastAPI service wrapping the local LLM) runs on your own
  network — nothing is sent to a third-party cloud service.
- Memory and progress data (sessions, scores, preferences) stay in the local
  SQLite file on the machine running the brain.

See `docs/ARCHITECTURE.md` for how this is enforced in code, and
`PLAN.md` Phase 12 for the fuller safety/ethics task list this page is part
of.
