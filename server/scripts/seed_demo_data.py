"""Seed a demo user with sessions, scores, and memories for local demos/screenshots.

Usage: python scripts/seed_demo_data.py (run from server/, with DUO_DB_PATH set
if you don't want to touch the default ./duo.db)
"""

import asyncio

from duo_server.memory import structured
from duo_server.memory.db import get_connection, init_db
from duo_server.memory.semantic import add_memory


async def seed():
    conn = get_connection()
    init_db(conn)

    cur = conn.execute("INSERT INTO users (name) VALUES (?)", ("Demo User",))
    user_id = cur.lastrowid
    conn.commit()

    structured.set_preference(conn, user_id, "favorite_game", "catch_the_light")

    session_id = structured.start_session(conn, user_id, game="catch_the_light")
    structured.record_score(conn, session_id, "catch_the_light", "reach_cm", 32.0)
    structured.record_score(conn, session_id, "catch_the_light", "reach_cm", 38.5)
    structured.end_session(conn, session_id, notes="Good first session, new best reach.")

    session_id = structured.start_session(conn, user_id, game="f1_reaction")
    structured.record_score(conn, session_id, "f1_reaction", "reaction_ms", 410.0)
    structured.record_score(conn, session_id, "f1_reaction", "reaction_ms", 365.0)
    structured.end_session(conn, session_id, notes="Reaction time improving.")

    await add_memory(conn, user_id, "Loves Catch the Light and always asks to play it first.")
    await add_memory(conn, user_id, "Prefers a short warmup before Air Piano.")
    await add_memory(conn, user_id, "Mentioned enjoying morning sessions best.")

    conn.close()
    print(f"Seeded demo user_id={user_id}")


if __name__ == "__main__":
    asyncio.run(seed())
