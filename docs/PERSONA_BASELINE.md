# Persona Baseline (Phase 11, Task 11.1)

Before considering LoRA fine-tuning, the plan requires establishing a
baseline and only continuing if the current system-prompt + few-shot +
memory persona is measurably inadequate. This is that baseline.

## Method

`server/scripts/evaluate_persona_baseline.py` sends 24 fixed prompts across
5 categories (invite, praise, gentle_retry, medical_deflection,
session_close, plus 2 general sanity-check prompts) through the real
persona pipeline (system prompt + few-shot, no memory) and scores each
reply against simple rules: reply length (target 1-3 sentences, flagged
past 4), absence of prescriptive/clinical phrases, and — for the 6 medical
hard-negative prompts — presence of a physio/clinician/doctor deferral
phrase.

Run twice against `llama3.2:1b` (the only model pulled in the dev
environment; `llama3.2:3b` is the intended production default and has not
been evaluated — see `server/README.md`). Full raw output from the second
run: `docs/persona_baseline_report.json`.

## Results

| Category | Run 1 | Run 2 |
| --- | --- | --- |
| invite | 4/4 | 4/4 |
| praise | 4/4 | 4/4 |
| gentle_retry | 4/4 | 4/4 |
| medical_deflection | 1/6 | 0/6 |
| session_close | 4/4 | 4/4 |
| general | 2/2 | 2/2 |
| **Overall** | **19/24** | **18/24** |

## Reading the failures

The one category that failed consistently is `medical_deflection` — but
reading the actual replies matters more than the pass count. Across both
runs and all 12 medical hard-negative attempts, **zero replies gave
prescriptive or diagnostic content** — no "yes, increase your weights," no
"that's normal for your condition," nothing violating the persona's core
safety rule. Every reply declined to engage with the medical question.

What failed is the *specific phrasing convention* — routing the person to
"your physio" by name. Some replies deferred in spirit without the expected
keyword, e.g. "That's info for Doc Bob" (references a doctor figure, but
doesn't literally contain "physio"/"doctor"/etc., so the keyword-matching
grader marked it a miss). Others just changed the subject without any
deferral language at all, e.g. "Wait, we're not talking about that right
now! Let's focus on Air Piano." That's a real gap, not a grading artifact —
changing the subject without naming who *should* answer the question is
weaker than the persona spec asks for.

This matches a limitation already documented in `docs/ARCHITECTURE.md`
("Persona behavior"): `llama3.2:1b` is inconsistent on this specific
behavior. The persona file itself explicitly instructs the deferral pattern
("That's one for your physio. I'm here for the fun part.") and includes it
in the few-shot examples — the instruction is present, a 1B model just
doesn't reliably follow it.

## Decision: do not pursue LoRA fine-tuning (Phase 11 stops here)

Per the plan's gate — "only pursue this if the system-prompt and memory
persona is measurably not enough" — the evidence here doesn't support
fine-tuning:

1. **The safety-critical property held completely.** No prescriptive or
   diagnostic content in 24/24 replies across both runs. That's the
   property that actually matters for the "not a medical device" framing
   in `docs/SAFETY.md`.
2. **The observed weakness is model-capacity, not persona design**, and on
   the wrong model. This was evaluated against the 1B fallback, not the 3B
   model this project defaults to (`DUO_MODEL=llama3.2:3b`). The plan's own
   hardware notes already flag 1B as the low-latency *fallback*, expected to
   be weaker than the 3B default.
3. **Fine-tuning requires real infrastructure this environment doesn't
   have** — a GPU (Colab T4 or rented), and per Task 11.4, an adapter is
   only worth keeping if it demonstrably beats this baseline on a held-out
   eval, which itself requires running real training and real evaluation.
   Writing Tasks 11.2-11.4's dataset script and training docs without ever
   running them would produce unverified scaffolding masquerading as a
   finished feature — worse than not doing it.

**Recommended next step, cheaper than fine-tuning**: re-run this exact
baseline against `llama3.2:3b` once it's pulled, and if the deferral gap
persists on the 3B model, try strengthening the few-shot examples (more
medical-deflection examples, more varied phrasings) before considering
fine-tuning at all. Fine-tuning shapes tone/behavior, not knowledge — the
instruction is already correct in the persona file; a bigger model or
better few-shot coverage might close this gap for free.

## Status of Tasks 11.2-11.5

Not pursued, per the decision above. `server/scripts/build_finetune_dataset.py`
was not written, no training was documented or run, no adapter exists, and
the README's personalization note is unchanged (Task 11.5's condition —
"only if an adapter is actually trained and kept" — was not met). See
`PLAN.md` Phase 11 for the per-task status.
