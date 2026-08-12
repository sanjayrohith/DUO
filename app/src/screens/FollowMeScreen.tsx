import React, { useEffect, useRef, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";

import { DuoFace, DuoFaceHandle } from "../components/face/DuoFace";
import { useGameSession } from "../components/games/useGameSession";
import { ESPSocket } from "../transport/espSocket";
import { useTracking } from "../vision/useTracking";

// Follow Me: DUO invites the person to move around and watches them via head
// tracking (the mobile base itself is remote-controlled hardware, out of
// software scope — this game only orchestrates invites, timing, and
// encouragement, plus keeping the gimbal pointed at the person). The session
// metric is minutes engaged, not any clinical measurement.

const ENCOURAGEMENT_INTERVAL_MS = 60_000;

interface FollowMeScreenProps {
  baseUrl: string;
  userId: number;
  espSocket: ESPSocket | null;
}

export default function FollowMeScreen({ baseUrl, userId, espSocket }: FollowMeScreenProps) {
  const faceRef = useRef<DuoFaceHandle>(null);
  const { duoLine, faceState, invite, recordAttempt, recordScore, close } = useGameSession({
    baseUrl,
    userId,
    game: "follow_me",
  });
  const { uiState } = useTracking(espSocket);
  const [playing, setPlaying] = useState(false);
  const startedAtRef = useRef<number>(0);
  const encourageTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    faceRef.current?.setFaceState(faceState);
  }, [faceState]);

  useEffect(
    () => () => {
      if (encourageTimer.current) clearInterval(encourageTimer.current);
    },
    []
  );

  const start = async () => {
    await invite();
    startedAtRef.current = Date.now();
    setPlaying(true);
    encourageTimer.current = setInterval(() => {
      recordAttempt("success");
    }, ENCOURAGEMENT_INTERVAL_MS);
  };

  const stop = async () => {
    if (encourageTimer.current) {
      clearInterval(encourageTimer.current);
      encourageTimer.current = null;
    }
    setPlaying(false);
    const minutesEngaged = Math.round(((Date.now() - startedAtRef.current) / 60_000) * 10) / 10;
    await recordScore("minutes_engaged", minutesEngaged);
    await close();
  };

  return (
    <View style={styles.container}>
      <DuoFace ref={faceRef} />
      <Text style={styles.line}>{duoLine}</Text>
      <Text style={styles.status}>Tracking: {uiState}</Text>
      {!playing ? (
        <Button title="Play Follow Me" onPress={start} />
      ) : (
        <Button title="Stop" onPress={stop} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  line: { fontSize: 16, textAlign: "center", paddingHorizontal: 24 },
  status: { color: "#666" },
});
