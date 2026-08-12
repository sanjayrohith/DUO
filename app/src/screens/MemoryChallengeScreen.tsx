import React, { useEffect, useRef, useState } from "react";
import { Button, Pressable, StyleSheet, Text, View } from "react-native";

import { DuoFace, DuoFaceHandle } from "../components/face/DuoFace";
import { useGameSession } from "../components/games/useGameSession";
import { getProgress } from "../transport/brainClient";

// Memory Challenge: a classic growing-sequence game. DUO shows a color
// sequence (flashed one at a time), the person repeats it via tap zones; the
// sequence grows by one color each successful round. Score is the longest
// sequence reached.

const COLORS = ["#ef476f", "#ffd166", "#06d6a0", "#118ab2"] as const;
type ColorIndex = 0 | 1 | 2 | 3;

const FLASH_ON_MS = 500;
const FLASH_GAP_MS = 250;
const METRIC = "best_sequence_length";

type Phase = "idle" | "showing" | "input";

interface MemoryChallengeScreenProps {
  baseUrl: string;
  userId: number;
}

export default function MemoryChallengeScreen({ baseUrl, userId }: MemoryChallengeScreenProps) {
  const faceRef = useRef<DuoFaceHandle>(null);
  const { duoLine, faceState, invite, recordAttempt, recordScore, close } = useGameSession({
    baseUrl,
    userId,
    game: "memory_challenge",
  });
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeColor, setActiveColor] = useState<ColorIndex | null>(null);
  const sequenceRef = useRef<ColorIndex[]>([]);
  const inputIndexRef = useRef(0);
  const bestLengthRef = useRef(0);
  const bestKnownRef = useRef(0);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    faceRef.current?.setFaceState(faceState);
  }, [faceState]);

  useEffect(
    () => () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    },
    []
  );

  const playSequence = (sequence: ColorIndex[]) => {
    setPhase("showing");
    let i = 0;
    const step = () => {
      if (i >= sequence.length) {
        setActiveColor(null);
        inputIndexRef.current = 0;
        setPhase("input");
        return;
      }
      setActiveColor(sequence[i]);
      flashTimerRef.current = setTimeout(() => {
        setActiveColor(null);
        flashTimerRef.current = setTimeout(step, FLASH_GAP_MS);
      }, FLASH_ON_MS);
      i += 1;
    };
    step();
  };

  const start = async () => {
    const progress = await getProgress(baseUrl, userId).catch(() => null);
    bestKnownRef.current = progress?.best_scores?.memory_challenge?.[METRIC] ?? 0;
    await invite();
    bestLengthRef.current = 0;
    sequenceRef.current = [randomColor()];
    playSequence(sequenceRef.current);
  };

  const handleTap = async (color: ColorIndex) => {
    if (phase !== "input") return;

    const expected = sequenceRef.current[inputIndexRef.current];
    if (color !== expected) {
      await recordAttempt("miss");
      await finish();
      return;
    }

    inputIndexRef.current += 1;
    if (inputIndexRef.current < sequenceRef.current.length) return;

    // Full sequence repeated correctly — grow it.
    const length = sequenceRef.current.length;
    if (length > bestLengthRef.current) bestLengthRef.current = length;

    if (length > bestKnownRef.current) {
      await recordAttempt("new_best");
    } else {
      await recordAttempt("success");
    }

    sequenceRef.current = [...sequenceRef.current, randomColor()];
    playSequence(sequenceRef.current);
  };

  const finish = async () => {
    setPhase("idle");
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    await recordScore(METRIC, bestLengthRef.current);
    await close();
  };

  return (
    <View style={styles.container}>
      <DuoFace ref={faceRef} />
      <Text style={styles.line}>{duoLine}</Text>
      <Text style={styles.status}>
        {phase === "idle" ? "Ready" : phase === "showing" ? "Watch..." : "Your turn"}
      </Text>
      <View style={styles.grid}>
        {COLORS.map((color, index) => (
          <Pressable
            key={color}
            style={[
              styles.cell,
              { backgroundColor: color, opacity: activeColor === index ? 1 : 0.5 },
            ]}
            onPress={() => handleTap(index as ColorIndex)}
          />
        ))}
      </View>
      {phase === "idle" && <Button title="Play Memory Challenge" onPress={start} />}
    </View>
  );
}

function randomColor(): ColorIndex {
  return Math.floor(Math.random() * COLORS.length) as ColorIndex;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  line: { fontSize: 16, textAlign: "center", paddingHorizontal: 24 },
  status: { color: "#666" },
  grid: { flexDirection: "row", flexWrap: "wrap", width: 176, gap: 8 },
  cell: { width: 84, height: 84, borderRadius: 12 },
});
