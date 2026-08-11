import pytest

from duo_server.games.state import EVENT_FACE_STATE, FaceState, next_line

ALL_EVENTS = ["invite", "attempt_success", "attempt_miss", "new_best", "session_close"]
TEMPLATED_EVENTS = ["attempt_success", "attempt_miss", "new_best"]


@pytest.mark.asyncio
@pytest.mark.parametrize("event", ALL_EVENTS)
async def test_event_returns_valid_face_state_and_nonempty_line(event):
    result = await next_line({"event": event, "game": "catch_the_light"})

    assert result["face_state"] in {state.value for state in FaceState}
    assert result["face_state"] == EVENT_FACE_STATE[event].value
    assert isinstance(result["text"], str)
    assert result["text"].strip()


@pytest.mark.asyncio
@pytest.mark.parametrize("event", TEMPLATED_EVENTS)
async def test_templated_events_do_not_call_the_llm(event, monkeypatch):
    async def explode(*args, **kwargs):
        raise AssertionError(f"{event} should not call the LLM")
        yield  # pragma: no cover - keeps this an async generator

    monkeypatch.setattr("duo_server.games.state.stream_chat", explode)

    result = await next_line({"event": event, "game": "catch_the_light"})
    assert result["text"].strip()


@pytest.mark.asyncio
async def test_attempt_miss_is_encouraging_not_corrective():
    result = await next_line({"event": "attempt_miss", "game": "catch_the_light"})
    lowered = result["text"].lower()
    assert not any(word in lowered for word in ["wrong", "failed", "incorrect", "you missed"])


async def test_unknown_event_raises():
    with pytest.raises(ValueError):
        await next_line({"event": "not_a_real_event", "game": "catch_the_light"})
