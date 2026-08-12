# Contributing to DUO

## Dev setup

See the component READMEs for full setup:

- `server/README.md` — Ollama install, LAN exposure, hardware expectations.
- `app/README.md` — Expo SDK/versions, dev build instructions, Expo Go
  limitations, computer vision path, audio.
- `firmware/README.md` — board/library setup, flashing, hardware
  verification checklist.

Quick reference:

```bash
# Brain (server/)
cd server
pip install -e ".[dev]"
uvicorn duo_server.main:app --host 0.0.0.0 --port 8000

# Phone app (app/)
cd app
npm install
npx expo start --dev-client   # requires a dev build, not Expo Go

# Firmware (firmware/duo_firmware/)
# Open in Arduino IDE, select an ESP32-C6 board, flash. See firmware/README.md.
```

## Running tests

```bash
cd server
pip install -e ".[dev]"
pytest
```

App-side type checking and lint land in Phase 13
(`.github/workflows/app.yml`); there is no test runner configured for
`app/` yet.

## Commit and PR expectations

- **Contributors commit their own work.** Do not commit on someone else's
  behalf, and do not use another contributor's git identity.
- If you use an AI coding assistant, commits should be authored under your
  own name/email, not the assistant's — the project's git history should
  reflect who is actually responsible for the change.
- Follow conventional-commit-style messages where practical (`feat:`,
  `fix:`, `docs:`, `test:`, `chore:`, `refactor:`, `build:`), scoped to the
  part of the repo touched (`server`, `app`, `firmware`, `docs`, `repo`).
- Keep the persona's never-rules in mind for anything touching
  `server/duo_server/persona/` or the games: no medical advice, no clinical
  measurements spoken back to the user, no shaming a missed target. See
  `docs/SAFETY.md`.
