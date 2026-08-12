import { useCallback, useState } from "react";

import {
  InteractionEvent,
  endSession,
  recordScore as recordScoreRequest,
  sendInteractionEvent,
  startSession,
} from "../../transport/brainClient";
import { FaceState } from "../face/DuoFace";

// Shared interaction-loop wiring (Task 9.7): session logging, DUO's spoken
// line + face state per interaction event, and score recording. Each game
// only needs to implement its own mechanic and call into this hook — it
// never talks to brainClient directly.

export interface GameSessionConfig {
  baseUrl: string;
  userId: number;
  game: string;
}

export function useGameSession({ baseUrl, userId, game }: GameSessionConfig) {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [duoLine, setDuoLine] = useState<string>("");
  const [faceState, setFaceState] = useState<FaceState>("idle");

  const applyEvent = useCallback(
    async (event: InteractionEvent) => {
      try {
        const response = await sendInteractionEvent(baseUrl, String(sessionId ?? ""), game, event);
        setDuoLine(response.text);
        setFaceState(response.face_state as FaceState);
      } catch {
        // Degrade gracefully: keep playing even if the brain is unreachable.
      }
    },
    [baseUrl, sessionId, game]
  );

  const invite = useCallback(async () => {
    const { session_id } = await startSession(baseUrl, userId, game);
    setSessionId(session_id);
    await applyEvent("invite");
    return session_id;
  }, [baseUrl, userId, game, applyEvent]);

  const recordAttempt = useCallback(
    async (outcome: "success" | "miss" | "new_best") => {
      const event: InteractionEvent =
        outcome === "success" ? "attempt_success" : outcome === "miss" ? "attempt_miss" : "new_best";
      await applyEvent(event);
    },
    [applyEvent]
  );

  const recordScore = useCallback(
    async (metric: string, value: number) => {
      if (sessionId === null) return;
      await recordScoreRequest(baseUrl, sessionId, game, metric, value);
    },
    [baseUrl, sessionId, game]
  );

  // Call recordScore() before close() — close() clears the session id, and
  // recordScore is a no-op once it's gone.
  const close = useCallback(
    async (notes?: string) => {
      await applyEvent("session_close");
      if (sessionId !== null) {
        await endSession(baseUrl, sessionId, notes);
      }
      setSessionId(null);
    },
    [applyEvent, baseUrl, sessionId]
  );

  return { sessionId, duoLine, faceState, invite, recordAttempt, recordScore, close };
}
