from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from duo_server.config import settings
from duo_server.games.state import next_line
from duo_server.llm.ollama_client import stream_chat
from duo_server.memory import structured
from duo_server.memory.db import get_connection, init_db
from duo_server.memory.semantic import recall
from duo_server.persona.loader import FEW_SHOT_TURNS, SYSTEM_PROMPT

MEMORY_RECALL_K = 3


@asynccontextmanager
async def lifespan(app: FastAPI):
    conn = get_connection()
    init_db(conn)
    app.state.db = conn
    yield
    conn.close()


app = FastAPI(title="DUO Brain", lifespan=lifespan)


class ChatRequest(BaseModel):
    session_id: str
    user_id: int | None = None
    message: str


class SessionStartRequest(BaseModel):
    user_id: int
    game: str | None = None


class SessionEndRequest(BaseModel):
    session_id: int
    notes: str | None = None


class ScoreRequest(BaseModel):
    session_id: int
    game: str
    metric: str
    value: float


class InteractionEventRequest(BaseModel):
    session_id: str
    game: str
    event: str


@app.get("/health")
async def health():
    return {"status": "ok", "model": settings.duo_model}


async def build_memory_block(conn, user_id: int, query: str) -> str:
    preferences = structured.get_preferences(conn, user_id)
    lines = []

    if preferences:
        pref_text = ", ".join(f"{k}={v}" for k, v in preferences.items())
        lines.append(f"Preferences: {pref_text}")

    try:
        memories = await recall(conn, user_id, query, k=MEMORY_RECALL_K)
    except Exception:
        memories = []
    if memories:
        lines.append("Remembers: " + "; ".join(memories))

    if not lines:
        return ""
    return "What DUO remembers about this person:\n" + "\n".join(lines)


@app.post("/chat")
async def chat(request: ChatRequest):
    conn = app.state.db
    messages = [{"role": "system", "content": SYSTEM_PROMPT}, *FEW_SHOT_TURNS]

    if request.user_id is not None:
        memory_block = await build_memory_block(conn, request.user_id, request.message)
        if memory_block:
            messages.append({"role": "system", "content": memory_block})

    messages.append({"role": "user", "content": request.message})

    async def event_generator():
        async for token in stream_chat(messages):
            yield {"data": token}

    return EventSourceResponse(event_generator())


@app.post("/session/start")
async def session_start(request: SessionStartRequest):
    session_id = structured.start_session(app.state.db, request.user_id, request.game)
    return {"session_id": session_id}


@app.post("/session/end")
async def session_end(request: SessionEndRequest):
    structured.end_session(app.state.db, request.session_id, request.notes)
    return {"status": "ok"}


@app.post("/score")
async def score(request: ScoreRequest):
    score_id = structured.record_score(
        app.state.db, request.session_id, request.game, request.metric, request.value
    )
    return {"score_id": score_id}


@app.get("/progress/{user_id}")
async def progress(user_id: int):
    conn = app.state.db
    recent_sessions = structured.get_recent_sessions(conn, user_id, n=20)

    game_metric_rows = conn.execute(
        """
        SELECT DISTINCT scores.game, scores.metric
        FROM scores
        JOIN sessions ON sessions.id = scores.session_id
        WHERE sessions.user_id = ?
        """,
        (user_id,),
    ).fetchall()

    best_scores = {}
    for game, metric in game_metric_rows:
        best_scores.setdefault(game, {})[metric] = structured.get_best(conn, user_id, game, metric)

    return {"recent_sessions": recent_sessions, "best_scores": best_scores}


@app.post("/interaction/event")
async def interaction_event(request: InteractionEventRequest):
    try:
        return await next_line({"event": request.event, "game": request.game})
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
