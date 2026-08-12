import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Pressable, StyleSheet, Text, View } from "react-native";

import { NoteSource, PianoPlayer } from "../audio/piano";
import { DuoFace, DuoFaceHandle } from "../components/face/DuoFace";
import { useGameSession } from "../components/games/useGameSession";

// Air Piano: large tap zones mapped to notes (also reachable via hand
// tracking once Task 8.1's detector is verified — see
// src/vision/handTracking.ts's keyIndexForHand, which produces the same key
// index a tap zone press does, so either input path drives pressKey()).
// Score is melody accuracy: notes hit over notes attempted, following a
// short target melody.

const MELODY: number[] = [0, 1, 2, 1, 0];
const KEY_COUNT = 5;

interface AirPianoScreenProps {
  baseUrl: string;
  userId: number;
  // Real note audio isn't included in this repo yet — supply require()'d
  // clips from app/assets/audio/ here. See app/README.md "Audio".
  noteSources: NoteSource[];
}

export default function AirPianoScreen({ baseUrl, userId, noteSources }: AirPianoScreenProps) {
  const faceRef = useRef<DuoFaceHandle>(null);
  const { duoLine, faceState, invite, recordAttempt, recordScore, close } = useGameSession({
    baseUrl,
    userId,
    game: "air_piano",
  });
  const piano = useMemo(() => new PianoPlayer(noteSources), [noteSources]);
  const [playing, setPlaying] = useState(false);
  const [melodyIndex, setMelodyIndex] = useState(0);
  const attemptsRef = useRef(0);
  const hitsRef = useRef(0);

  useEffect(() => {
    faceRef.current?.setFaceState(faceState);
  }, [faceState]);

  useEffect(() => () => piano.release(), [piano]);

  const start = async () => {
    await invite();
    setPlaying(true);
    setMelodyIndex(0);
    attemptsRef.current = 0;
    hitsRef.current = 0;
  };

  // Shared by tap zones and (once wired) hand-tracking key detection.
  const pressKey = async (key: number) => {
    piano.play(key);
    if (!playing) return;

    attemptsRef.current += 1;
    const expected = MELODY[melodyIndex];

    if (key !== expected) {
      await recordAttempt("miss");
      setMelodyIndex(0);
      return;
    }

    hitsRef.current += 1;
    const nextIndex = melodyIndex + 1;
    if (nextIndex >= MELODY.length) {
      await recordAttempt("new_best"); // full melody completed
      setMelodyIndex(0);
    } else {
      await recordAttempt("success");
      setMelodyIndex(nextIndex);
    }
  };

  const stop = async () => {
    setPlaying(false);
    const accuracyPct =
      attemptsRef.current > 0 ? Math.round((hitsRef.current / attemptsRef.current) * 100) : 0;
    await recordScore("accuracy_pct", accuracyPct);
    await close();
  };

  return (
    <View style={styles.container}>
      <DuoFace ref={faceRef} />
      <Text style={styles.line}>{duoLine}</Text>
      <View style={styles.keys}>
        {Array.from({ length: KEY_COUNT }, (_, key) => (
          <Pressable key={key} style={styles.key} onPress={() => pressKey(key)}>
            <Text style={styles.keyLabel}>{key + 1}</Text>
          </Pressable>
        ))}
      </View>
      {!playing ? <Button title="Play Air Piano" onPress={start} /> : <Button title="Stop" onPress={stop} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  line: { fontSize: 16, textAlign: "center", paddingHorizontal: 24 },
  keys: { flexDirection: "row", gap: 8 },
  key: {
    width: 56,
    height: 96,
    backgroundColor: "#e6f4fe",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  keyLabel: { fontSize: 18, fontWeight: "600" },
});
