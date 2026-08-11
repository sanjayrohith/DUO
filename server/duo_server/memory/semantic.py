import sqlite3
import struct

import httpx

from duo_server.config import settings


def _serialize(embedding: list[float]) -> bytes:
    return struct.pack(f"{len(embedding)}f", *embedding)


async def _embed(text: str) -> list[float]:
    url = f"{settings.ollama_base_url}/embeddings"
    payload = {"model": settings.duo_embed_model, "input": text}

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        return response.json()["data"][0]["embedding"]


async def add_memory(conn: sqlite3.Connection, user_id: int, text: str) -> int:
    embedding = await _embed(text)

    cur = conn.execute(
        "INSERT INTO memories (user_id, text) VALUES (?, ?)", (user_id, text)
    )
    memory_id = cur.lastrowid
    conn.execute(
        "INSERT INTO memories_vec (rowid, embedding) VALUES (?, ?)",
        (memory_id, _serialize(embedding)),
    )
    conn.commit()
    return memory_id


_KNN_CANDIDATE_POOL = 50  # over-fetch before filtering by user_id, then re-limit to k


async def recall(conn: sqlite3.Connection, user_id: int, query: str, k: int = 3) -> list[str]:
    query_embedding = await _embed(query)

    # vec0 requires the LIMIT directly on its own KNN query, so the neighbor
    # search runs in a subquery and the user_id filter + final limit happen
    # in the outer query.
    rows = conn.execute(
        """
        SELECT memories.text
        FROM (
            SELECT rowid, distance
            FROM memories_vec
            WHERE embedding MATCH ?
            ORDER BY distance
            LIMIT ?
        ) AS nearest
        JOIN memories ON memories.id = nearest.rowid
        WHERE memories.user_id = ?
        ORDER BY nearest.distance
        LIMIT ?
        """,
        (_serialize(query_embedding), _KNN_CANDIDATE_POOL, user_id, k),
    ).fetchall()
    return [row[0] for row in rows]
