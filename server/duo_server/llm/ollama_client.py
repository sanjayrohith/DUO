import json
import logging
from collections.abc import AsyncIterator

import httpx

from duo_server.config import settings

logger = logging.getLogger(__name__)

FALLBACK_LINE = "Hmm, I can't quite reach my thoughts right now. Want to try again in a moment?"


async def stream_chat(messages: list[dict]) -> AsyncIterator[str]:
    url = f"{settings.ollama_base_url}/chat/completions"
    payload = {"model": settings.duo_model, "messages": messages, "stream": True}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream("POST", url, json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    data = line[len("data: "):]
                    if data == "[DONE]":
                        break
                    chunk = json.loads(data)
                    delta = chunk["choices"][0]["delta"].get("content")
                    if delta:
                        yield delta
    except (httpx.HTTPError, json.JSONDecodeError, KeyError, IndexError) as exc:
        logger.error("Ollama chat stream failed: %s", exc)
        yield FALLBACK_LINE
