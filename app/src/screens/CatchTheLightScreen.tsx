import React, { useEffect, useRef, useState } from "react";
import { Button, PanResponder, StyleSheet, Text, View } from "react-native";

import { DuoFace, DuoFaceHandle } from "../components/face/DuoFace";
import { useGameSession } from "../components/games/useGameSession";
import { getProgress } from "../transport/brainClient";

// Catch the Light: a target sits somewhere along a reach track; the person
// drags toward it. Reach distance is tracked as a percentage of the track,
// never presented to the user as a clinical measurement (persona rule) — the
// UI only shows "new best" / encouragement, never the raw number spoken.
// Reach input is touch-drag here; hand-tracking-driven reach (once Task 8.1
// is verified) would feed the same handleRelease() reach percentage.

const METRIC = "reach_pct";
const HIT_TOLERANCE_PCT = 10;
const TRACK_WIDTH = 280;

interface CatchTheLightScreenProps {
  baseUrl: string;
  userId: number;
}

export default function CatchTheLightScreen({ baseUrl, userId }: CatchTheLightScreenProps) {
  const faceRef = useRef<DuoFaceHandle>(null);
  const { duoLine, faceState, invite, recordAttempt, recordScore, close } = useGameSession({
    baseUrl,
    userId,
    game: "catch_the_light",
  });
  const [playing, setPlaying] = useState(false);
  const [targetPct, setTargetPct] = useState(60);
  const [dragPct, setDragPct] = useState(0);
  const bestRef = useRef<number>(0);
  const dragPctRef = useRef(0);

  useEffect(() => {
    faceRef.current?.setFaceState(faceState);
  }, [faceState]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => playing,
      onPanResponderMove: (_evt, gesture) => {
        const pct = Math.min(100, Math.max(0, (gesture.dx / TRACK_WIDTH) * 100));
        dragPctRef.current = pct;
        setDragPct(pct);
      },
      onPanResponderRelease: () => {
        handleRelease(dragPctRef.current);
      },
    })
  ).current;

  const start = async () => {
    const progress = await getProgress(baseUrl, userId).catch(() => null);
    bestRef.current = progress?.best_scores?.catch_the_light?.[METRIC] ?? 0;
    await invite();
    setPlaying(true);
    setTargetPct(40 + Math.random() * 50);
    setDragPct(0);
    dragPctRef.current = 0;
  };

  const handleRelease = async (reachPct: number) => {
    if (!playing) return;
    await recordScore(METRIC, reachPct);

    if (reachPct > bestRef.current) {
      bestRef.current = reachPct;
      await recordAttempt("new_best");
    } else if (Math.abs(reachPct - targetPct) <= HIT_TOLERANCE_PCT) {
      await recordAttempt("success");
    } else {
      await recordAttempt("miss");
    }

    setTargetPct(40 + Math.random() * 50);
    setDragPct(0);
  };

  const stop = async () => {
    setPlaying(false);
    await close();
  };

  return (
    <View style={styles.container}>
      <DuoFace ref={faceRef} />
      <Text style={styles.line}>{duoLine}</Text>
      <View style={styles.track} {...panResponder.panHandlers}>
        <View style={[styles.target, { left: (targetPct / 100) * TRACK_WIDTH }]} />
        <View style={[styles.hand, { left: (dragPct / 100) * TRACK_WIDTH }]} />
      </View>
      {!playing ? (
        <Button title="Play Catch the Light" onPress={start} />
      ) : (
        <Button title="Stop" onPress={stop} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  line: { fontSize: 16, textAlign: "center", paddingHorizontal: 24 },
  track: {
    width: TRACK_WIDTH,
    height: 60,
    backgroundColor: "#f0f0f0",
    borderRadius: 30,
    justifyContent: "center",
  },
  target: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ffd166",
  },
  hand: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1a1a2e",
  },
});
