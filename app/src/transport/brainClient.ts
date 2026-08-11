// Client for the DUO brain (FastAPI service): a streaming SSE chat endpoint
// plus REST helpers for sessions, scores, progress, and interaction events.
//
// React Native's fetch does not reliably support reading a streaming
// response body (no usable ReadableStream reader in the Hermes/RN runtime),
// so the SSE stream is read via XMLHttpRequest's growing `responseText` and
// `progress` events instead — the same approach used by most RN SSE clients.

export interface BrainClientConfig {
  baseUrl: string; // e.g. "http://192.168.1.42:8000"
}

export interface ChatRequest {
  session_id: string;
  user_id?: number;
  message: string;
}

async function requestJson<T>(baseUrl: string, path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

export async function checkHealth(baseUrl: string): Promise<{ status: string; model: string }> {
  return requestJson(baseUrl, "/health");
}

// Streams DUO's reply token by token. Consume with `for await (const token of streamChat(...))`.
export async function* streamChat(
  baseUrl: string,
  request: ChatRequest,
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  const chunks: string[] = [];
  let resolveNext: (() => void) | null = null;
  let done = false;
  let error: Error | null = null;
  let readOffset = 0;

  const xhr = new XMLHttpRequest();
  xhr.open("POST", `${baseUrl}/chat`);
  xhr.setRequestHeader("Content-Type", "application/json");

  const wake = () => {
    if (resolveNext) {
      const r = resolveNext;
      resolveNext = null;
      r();
    }
  };

  xhr.onprogress = () => {
    const newText = xhr.responseText.slice(readOffset);
    readOffset = xhr.responseText.length;
    for (const line of newText.split("\n")) {
      if (line.startsWith("data: ")) {
        chunks.push(line.slice("data: ".length));
      }
    }
    wake();
  };

  xhr.onload = () => {
    done = true;
    wake();
  };

  xhr.onerror = () => {
    error = new Error("Chat stream connection failed");
    done = true;
    wake();
  };

  signal?.addEventListener("abort", () => {
    xhr.abort();
    done = true;
    wake();
  });

  xhr.send(JSON.stringify(request));

  try {
    while (true) {
      while (chunks.length > 0) {
        yield chunks.shift() as string;
      }
      if (done) {
        if (error) throw error;
        return;
      }
      await new Promise<void>((resolve) => {
        resolveNext = resolve;
      });
    }
  } finally {
    xhr.abort();
  }
}

export async function startSession(
  baseUrl: string,
  userId: number,
  game?: string
): Promise<{ session_id: number }> {
  return requestJson(baseUrl, "/session/start", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, game }),
  });
}

export async function endSession(
  baseUrl: string,
  sessionId: number,
  notes?: string
): Promise<{ status: string }> {
  return requestJson(baseUrl, "/session/end", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, notes }),
  });
}

export async function recordScore(
  baseUrl: string,
  sessionId: number,
  game: string,
  metric: string,
  value: number
): Promise<{ score_id: number }> {
  return requestJson(baseUrl, "/score", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, game, metric, value }),
  });
}

export interface Progress {
  recent_sessions: Array<{
    id: number;
    started_at: string;
    ended_at: string | null;
    game: string | null;
    notes: string | null;
  }>;
  best_scores: Record<string, Record<string, number>>;
}

export async function getProgress(baseUrl: string, userId: number): Promise<Progress> {
  return requestJson(baseUrl, `/progress/${userId}`);
}

export interface InteractionEventResponse {
  text: string;
  face_state: string;
}

export type InteractionEvent =
  | "invite"
  | "attempt_success"
  | "attempt_miss"
  | "new_best"
  | "session_close";

export async function sendInteractionEvent(
  baseUrl: string,
  sessionId: string,
  game: string,
  event: InteractionEvent
): Promise<InteractionEventResponse> {
  return requestJson(baseUrl, "/interaction/event", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, game, event }),
  });
}
