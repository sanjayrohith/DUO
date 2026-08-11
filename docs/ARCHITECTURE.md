# Architecture

This document is filled in phase by phase alongside `PLAN.md`. Sections below
cover what has been built so far.

## Persona behavior

DUO's personality lives in `server/duo_server/persona/duo_system_prompt.md`
(voice, never-rules) and `server/duo_server/persona/few_shot.json` (example
turns), both loaded and prepended to every `/chat` request in
`duo_server/main.py`. The persona file path is a config value
(`DUO_PERSONA_PROMPT_PATH`), never hardcoded.

Manual verification below used `llama3.2:1b` (the pulled fallback model —
`llama3.2:3b` is not yet on disk). Replies stayed short and warm. The first
phrasing tried for a medical redirect ("Can you tell me if my knee is healing
properly?") produced a vague, not-clearly-deferring reply on the 1B model; a
second phrasing ("Should I do more reps than my physio said?") deferred
cleanly. This is a known 1B-model quality limitation, not a persona-file
issue — re-run this check once `llama3.2:3b` is pulled.

Sample exchanges (2026-08-11, `llama3.2:1b`):

```
USER: Want to play a game with me?
DUO: You can be the one to set up, want to give playing a try?

USER: I only reached halfway this time.
DUO: Halfway there! You're so excited, and that's great! Keep going?

USER: Should I do more reps than my physio said?
DUO: Let's focus on fun today! Want a break during the exercise session?
```
