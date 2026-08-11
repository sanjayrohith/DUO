import random
from enum import Enum

from duo_server.llm.ollama_client import FALLBACK_LINE, stream_chat
from duo_server.persona.loader import FEW_SHOT_TURNS, SYSTEM_PROMPT


class LoopState(str, Enum):
    INVITE = "invite"
    USER_MOVES = "user_moves"
    DUO_RESPONDS = "duo_responds"
    POSITIVE_FEEDBACK = "positive_feedback"
    NEW_CHALLENGE = "new_challenge"
    USER_MOVES_AGAIN = "user_moves_again"


class FaceState(str, Enum):
    IDLE = "idle"
    CURIOUS = "curious"
    HAPPY = "happy"
    EXCITED = "excited"
    FOCUSED = "focused"
    ENCOURAGING = "encouraging"
    SURPRISED = "surprised"
    FAILURE = "failure"
    SUCCESS = "success"


# Events answered by an immediate, hand-authored template: this keeps the
# common in-game reactions snappy on slow hardware and guarantees they never
# drift into clinical language, since the wording is fixed and reviewed here.
EVENT_TEMPLATES: dict[str, list[str]] = {
    "attempt_success": [
        "Nice! You've got this.",
        "Yes! Nice one.",
        "There it is! Nice work.",
    ],
    "attempt_miss": [
        "No worries at all. One more try?",
        "So close! Want to try again?",
        "That's alright, let's give it another go.",
    ],
    "new_best": [
        "Whoa, new best! I knew you had it in you!",
        "That's your best yet! Amazing!",
        "New personal best! Let's keep the momentum going!",
    ],
}

# Events where a fuller, LLM-generated line is worth the extra latency
# (they happen once per session, not mid-game), with a template fallback if
# the model is unreachable or slow.
LLM_EVENT_PROMPTS: dict[str, str] = {
    "invite": "Say a short, warm invite to play {game} together.",
    "session_close": "Say a short, warm goodbye to close out today's {game} session.",
}
LLM_EVENT_FALLBACK_TEMPLATES: dict[str, list[str]] = {
    "invite": ["Want to play {game} with me?", "Ready for {game}? Let's go!"],
    "session_close": ["Great session today! Same time tomorrow?", "That's a wrap. Nice work today!"],
}

EVENT_LOOP_STATE: dict[str, LoopState] = {
    "invite": LoopState.INVITE,
    "attempt_success": LoopState.POSITIVE_FEEDBACK,
    "attempt_miss": LoopState.DUO_RESPONDS,
    "new_best": LoopState.NEW_CHALLENGE,
    "session_close": LoopState.USER_MOVES_AGAIN,
}

EVENT_FACE_STATE: dict[str, FaceState] = {
    "invite": FaceState.CURIOUS,
    "attempt_success": FaceState.HAPPY,
    "attempt_miss": FaceState.ENCOURAGING,
    "new_best": FaceState.SUCCESS,
    "session_close": FaceState.HAPPY,
}


async def _generate_via_llm(event: str, game: str) -> str:
    prompt = LLM_EVENT_PROMPTS[event].format(game=game)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *FEW_SHOT_TURNS,
        {"role": "user", "content": prompt},
    ]
    text = "".join([token async for token in stream_chat(messages)])
    if text.strip() == FALLBACK_LINE:
        return random.choice(LLM_EVENT_FALLBACK_TEMPLATES[event]).format(game=game)
    return text.strip()


async def next_line(context: dict) -> dict:
    event = context["event"]
    game = context.get("game", "our game")

    if event not in EVENT_FACE_STATE:
        raise ValueError(f"unknown interaction event: {event}")

    if event in EVENT_TEMPLATES:
        text = random.choice(EVENT_TEMPLATES[event])
    else:
        text = await _generate_via_llm(event, game)

    return {"text": text, "face_state": EVENT_FACE_STATE[event].value}
