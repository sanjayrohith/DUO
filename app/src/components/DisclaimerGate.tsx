import React, { useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";

import {
  DISCLAIMER_TEXT,
  acknowledgeDisclaimer,
  hasAcknowledgedDisclaimer,
} from "../state/disclaimerStore";

// First-launch disclaimer (Task 12.2): blocks the app until the person
// acknowledges the wellness-only framing, once. The same DISCLAIMER_TEXT is
// shown again, non-blocking, in SettingsScreen — see its "Safety" section.
export default function DisclaimerGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    hasAcknowledgedDisclaimer().then((ack) => {
      setAcknowledged(ack);
      setChecking(false);
    });
  }, []);

  const accept = async () => {
    await acknowledgeDisclaimer();
    setAcknowledged(true);
  };

  if (checking) return null;

  if (!acknowledged) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Before you start</Text>
        <Text style={styles.text}>{DISCLAIMER_TEXT}</Text>
        <Button title="I understand" onPress={accept} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  title: { fontSize: 20, fontWeight: "700" },
  text: { fontSize: 16, textAlign: "center", color: "#333" },
});
