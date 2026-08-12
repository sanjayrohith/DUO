import React, { useEffect, useRef, useState } from "react";
import { Button, Pressable, StyleSheet, Text, View } from "react-native";

import { DuoFace, DuoFaceHandle } from "../components/face/DuoFace";
import { useGameSession } from "../components/games/useGameSession";
import { getProgress } from "../transport/brainClient";

// F1 Reaction Game: LEFT / RIGHT / BRAKE / GO prompts appear after a random
// delay (classic reaction-test structure); the person taps the matching
// zone as fast as possible. Reaction time in ms is the internal metric —
// never spoken by DUO as a number (persona rule), only used for best/average
// tracking and to trigger the "new best" celebration.

type Prompt = "LEFT" | "RIGHT" | "BRAKE" | "GO";
const PROMPTS: Prompt[] = ["LEFT", "RIGHT", "BRAKE", "GO"];
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 3000;
const BEST_METRIC = "best_reaction_ms";
const AVG_METRIC = "avg_reaction_ms";

interface F1ReactionScreenProps {
  baseUrl: string;
  userId: number;
}

export default function F1ReactionScreen({ baseUrl, userId }: F1ReactionScreenProps) {
  const faceRef = useRef<DuoFaceHandle>(null);
  const { duoLine, faceState, invite, recordAttempt, recordScore, close } = useGameSession({
    baseUrl,
    userId,
    game: "f1_reaction",
  });
  const [playing, setPlaying] = useState(false);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const promptShownAtRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);
  const bestKnownMsRef = useRef<number | null>(null);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    faceRef.current?.setFaceState(faceState);
  }, [faceState]);

  useEffect(
    () => () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    },
    []
  );

  const scheduleNextPrompt = () => {
    setPrompt(null);
    const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
    delayTimerRef.current = setTimeout(() => {
      setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
      promptShownAtRef.current = Date.now();
    }, delay);
  };

  const start = async () => {
    const progress = await getProgress(baseUrl, userId).catch(() => null);
    bestKnownMsRef.current = progress?.best_scores?.f1_reaction?.[BEST_METRIC] ?? null;
    await invite();
    setPlaying(true);
    reactionTimesRef.current = [];
    scheduleNextPrompt();
  };

  const handleTap = async (choice: Prompt) => {
    if (!playing || prompt === null) return;

    if (choice !== prompt) {
      await recordAttempt("miss");
      scheduleNextPrompt();
      return;
    }

    const reactionMs = Date.now() - promptShownAtRef.current;
    reactionTimesRef.current.push(reactionMs);

    if (bestKnownMsRef.current === null || reactionMs < bestKnownMsRef.current) {
      bestKnownMsRef.current = reactionMs;
      await recordAttempt("new_best");
    } else {
      await recordAttempt("success");
    }
    scheduleNextPrompt();
  };

  const stop = async () => {
    setPlaying(false);
    if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    setPrompt(null);

    const times = reactionTimesRef.current;
    if (times.length > 0) {
      await recordScore(BEST_METRIC, Math.min(...times));
      await recordScore(AVG_METRIC, Math.round(times.reduce((a, b) => a + b, 0) / times.length));
    }
    await close();
  };

  return (
    <View style={styles.container}>
      <DuoFace ref={faceRef} />
      <Text style={styles.line}>{duoLine}</Text>
      <Text style={styles.prompt}>{prompt ?? (playing ? "..." : "-")}</Text>
      <View style={styles.zones}>
        {PROMPTS.map((choice) => (
          <Pressable key={choice} style={styles.zone} onPress={() => handleTap(choice)}>
            <Text style={styles.zoneLabel}>{choice}</Text>
          </Pressable>
        ))}
      </View>
      {!playing ? (
        <Button title="Play F1 Reaction" onPress={start} />
      ) : (
        <Button title="Stop" onPress={stop} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  line: { fontSize: 16, textAlign: "center", paddingHorizontal: 24 },
  prompt: { fontSize: 32, fontWeight: "700" },
  zones: { flexDirection: "row", gap: 10, flexWrap: "wrap", justifyContent: "center" },
  zone: {
    width: 72,
    height: 72,
    backgroundColor: "#e6f4fe",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  zoneLabel: { fontWeight: "700", fontSize: 12 },
});
