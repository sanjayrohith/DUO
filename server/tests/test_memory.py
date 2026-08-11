import struct

import pytest

from duo_server.memory import structured
from duo_server.memory.db import get_connection, init_db


@pytest.fixture
def conn(tmp_path):
    connection = get_connection(str(tmp_path / "test.db"))
    init_db(connection)
    yield connection
    connection.close()


def _make_user(conn) -> int:
    cur = conn.execute("INSERT INTO users (name) VALUES (?)", ("Test User",))
    conn.commit()
    return cur.lastrowid


def test_get_best_returns_max_score(conn):
    user_id = _make_user(conn)
    session_id = structured.start_session(conn, user_id, game="catch_the_light")

    structured.record_score(conn, session_id, "catch_the_light", "reach_cm", 20.0)
    structured.record_score(conn, session_id, "catch_the_light", "reach_cm", 35.0)
    structured.record_score(conn, session_id, "catch_the_light", "reach_cm", 28.0)

    assert structured.get_best(conn, user_id, "catch_the_light", "reach_cm") == 35.0


def test_get_best_returns_none_when_no_scores(conn):
    user_id = _make_user(conn)
    assert structured.get_best(conn, user_id, "catch_the_light", "reach_cm") is None


def test_preferences_round_trip(conn):
    user_id = _make_user(conn)
    structured.set_preference(conn, user_id, "favorite_game", "air_piano")
    structured.set_preference(conn, user_id, "favorite_game", "boxing")  # overwrite

    prefs = structured.get_preferences(conn, user_id)
    assert prefs["favorite_game"] == "boxing"


def _fake_embedding(seed: float) -> list[float]:
    return [seed] * 768


@pytest.mark.asyncio
async def test_recall_ranks_relevant_memory_first(conn, monkeypatch):
    from duo_server.memory import semantic

    user_id = _make_user(conn)

    embeddings = {
        "loves catch the light": _fake_embedding(0.10),
        "prefers quiet music": _fake_embedding(0.90),
        "query: what game first": _fake_embedding(0.11),
    }

    async def fake_embed(text):
        return embeddings[text]

    monkeypatch.setattr(semantic, "_embed", fake_embed)

    for text in ["loves catch the light", "prefers quiet music"]:
        cur = conn.execute("INSERT INTO memories (user_id, text) VALUES (?, ?)", (user_id, text))
        memory_id = cur.lastrowid
        embedding = embeddings[text]
        conn.execute(
            "INSERT INTO memories_vec (rowid, embedding) VALUES (?, ?)",
            (memory_id, struct.pack(f"{len(embedding)}f", *embedding)),
        )
    conn.commit()

    results = await semantic.recall(conn, user_id, "query: what game first", k=2)

    assert results[0] == "loves catch the light"
