import logging

logger = logging.getLogger(__name__)

# Advisory only — flags a reply for review during testing, never blocks a
# response. The persona is instructed never to produce these; this is a
# cheap net to catch a slip, not a guarantee.
CLINICAL_DIRECTIVE_PHRASES = [
    "you should increase",
    "you should decrease",
    "increase your",
    "decrease your",
    "add more weight",
    "add more reps",
    "do more reps",
    "diagnos",
    "prescri",
    "that's normal for your condition",
    "not normal for your condition",
    "your condition is",
]


def flag_clinical_language(text: str) -> list[str]:
    lowered = text.lower()
    return [phrase for phrase in CLINICAL_DIRECTIVE_PHRASES if phrase in lowered]


def check_and_log(text: str, context: str = "") -> list[str]:
    flagged = flag_clinical_language(text)
    if flagged:
        logger.warning(
            "Advisory: possible clinical language in %s reply (matched %s): %r",
            context or "unlabeled",
            flagged,
            text,
        )
    return flagged
