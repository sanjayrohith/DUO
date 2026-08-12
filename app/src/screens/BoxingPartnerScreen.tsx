import React, { useEffect, useRef, useState } from "react";
import { Button, Pressable, StyleSheet, Text, View } from "react-native";

import { DuoFace, DuoFaceHandle } from "../components/face/DuoFace";
import { useGameSession } from "../components/games/useGameSession";
import { getProgress } from "../transport/brainClient";

// Boxing Partner: DUO calls LEFT / RIGHT / DUCK, the person reacts. Response
// is large on-screen tap zones here (the plan's explicit fallback for this
// game) — pose/hand-tracking-driven reactions would call handlePrompt() with
// the same three values once Task 8.1's detector is verified. Tracks correct
// reactions and the best streak.

type Prompt = "LEFT" | "RIGHT" | "DUCK";
const PROMPTS: Prompt[] = ["LEFT", "RIGHT", "DUCK"];
const ROUND_TIMEOUT_MS = 2000;
const METRIC = "best_streak";

interface BoxingPartnerScreenProps {
  baseUrl: string;
  userId: number;
}

export default function BoxingPartnerScreen({ baseUrl, userId }: BoxingPartnerScreenProps) {
  const faceRef = useRef<DuoFaceHandle>(null);
  const { duoLine, faceState, invite, recordAttempt, recordScore, close } = useGameSession({
    baseUrl,
    userId,
    game: "boxing_partner",
  });
  const [playing, setPlaying] = useState(false);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [streak, setStreak] = useState(0);
  const bestStreakRef = useRef(0);
  const bestKnownRef = useRef(0);
  const roundTokenRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    faceRef.current?.setFaceState(faceState);
  }, [faceState]);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  const nextRound = () => {
    const token = ++roundTokenRef.current;
    const next = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    setPrompt(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (roundTokenRef.current === token) handleMiss();
    }, ROUND_TIMEOUT_MS);
  };

  const start = async () => {
    const progress = await getProgress(baseUrl, userId).catch(() => null);
    bestKnownRef.current = progress?.best_scores?.boxing_partner?.[METRIC] ?? 0;
    await invite();
    setPlaying(true);
    setStreak(0);
    bestStreakRef.current = 0;
    nextRound();
  };

  const handleMiss = async () => {
    setStreak(0);
    await recordAttempt("miss");
    nextRound();
  };

  const handleTap = async (choice: Prompt) => {
    if (!playing || prompt === null) return;
    roundTokenRef.current += 1; // invalidate the pending timeout for this round
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (choice !== prompt) {
      await handleMiss();
      return;
    }

    const nextStreak = streak + 1;
    setStreak(nextStreak);
    if (nextStreak > bestStreakRef.current) bestStreakRef.current = nextStreak;

    if (nextStreak > bestKnownRef.current) {
      await recordAttempt("new_best");
    } else {
      await recordAttempt("success");
    }
    nextRound();
  };

  const stop = async () => {
    setPlaying(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPrompt(null);
    await recordScore(METRIC, bestStreakRef.current);
    await close();
  };

  return (
    <View style={styles.container}>
      <DuoFace ref={faceRef} />
      <Text style={styles.line}>{duoLine}</Text>
      <Text style={styles.prompt}>{prompt ?? "-"}</Text>
      <Text style={styles.streak}>Streak: {streak}</Text>
      <View style={styles.zones}>
        {PROMPTS.map((choice) => (
          <Pressable key={choice} style={styles.zone} onPress={() => handleTap(choice)}>
            <Text style={styles.zoneLabel}>{choice}</Text>
          </Pressable>
        ))}
      </View>
      {!playing ? (
        <Button title="Play Boxing Partner" onPress={start} />
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
  streak: { color: "#666" },
  zones: { flexDirection: "row", gap: 12 },
  zone: {
    width: 88,
    height: 88,
    backgroundColor: "#e6f4fe",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  zoneLabel: { fontWeight: "700" },
});
