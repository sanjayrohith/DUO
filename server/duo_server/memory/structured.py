import sqlite3


def start_session(conn: sqlite3.Connection, user_id: int, game: str | None = None) -> int:
    cur = conn.execute(
        "INSERT INTO sessions (user_id, game) VALUES (?, ?)", (user_id, game)
    )
    conn.commit()
    return cur.lastrowid


def end_session(conn: sqlite3.Connection, session_id: int, notes: str | None = None) -> None:
    conn.execute(
        "UPDATE sessions SET ended_at = datetime('now'), notes = ? WHERE id = ?",
        (notes, session_id),
    )
    conn.commit()


def record_score(
    conn: sqlite3.Connection, session_id: int, game: str, metric: str, value: float
) -> int:
    cur = conn.execute(
        "INSERT INTO scores (session_id, game, metric, value) VALUES (?, ?, ?, ?)",
        (session_id, game, metric, value),
    )
    conn.commit()
    return cur.lastrowid


def get_best(conn: sqlite3.Connection, user_id: int, game: str, metric: str) -> float | None:
    row = conn.execute(
        """
        SELECT MAX(scores.value)
        FROM scores
        JOIN sessions ON sessions.id = scores.session_id
        WHERE sessions.user_id = ? AND scores.game = ? AND scores.metric = ?
        """,
        (user_id, game, metric),
    ).fetchone()
    return row[0]


def get_recent_sessions(conn: sqlite3.Connection, user_id: int, n: int = 5) -> list[dict]:
    rows = conn.execute(
        """
        SELECT id, started_at, ended_at, game, notes
        FROM sessions
        WHERE user_id = ?
        ORDER BY started_at DESC
        LIMIT ?
        """,
        (user_id, n),
    ).fetchall()
    columns = ["id", "started_at", "ended_at", "game", "notes"]
    return [dict(zip(columns, row)) for row in rows]


def set_preference(conn: sqlite3.Connection, user_id: int, key: str, value: str) -> None:
    conn.execute(
        """
        INSERT INTO preferences (user_id, key, value) VALUES (?, ?, ?)
        ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value
        """,
        (user_id, key, value),
    )
    conn.commit()


def get_preferences(conn: sqlite3.Connection, user_id: int) -> dict[str, str]:
    rows = conn.execute(
        "SELECT key, value FROM preferences WHERE user_id = ?", (user_id,)
    ).fetchall()
    return dict(rows)
