import json
from pathlib import Path

from fastapi import FastAPI
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from duo_server.config import settings
from duo_server.llm.ollama_client import stream_chat

app = FastAPI(title="DUO Brain")

SYSTEM_PROMPT = Path(settings.duo_persona_prompt_path).read_text()
FEW_SHOT_TURNS = json.loads(Path(settings.duo_persona_few_shot_path).read_text())


class ChatRequest(BaseModel):
    session_id: str
    message: str


@app.get("/health")
async def health():
    return {"status": "ok", "model": settings.duo_model}


@app.post("/chat")
async def chat(request: ChatRequest):
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *FEW_SHOT_TURNS,
        {"role": "user", "content": request.message},
    ]

    async def event_generator():
        async for token in stream_chat(messages):
            yield {"data": token}

    return EventSourceResponse(event_generator())
