import React, { useEffect, useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

import { checkHealth } from "../transport/brainClient";
import { ESPSocket } from "../transport/espSocket";
import { DISCLAIMER_TEXT } from "../state/disclaimerStore";
import {
  brainBaseUrl,
  ConnectionSettings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from "../state/settingsStore";

type TestStatus = "idle" | "testing" | "ok" | "failed";

const ESP_TEST_TIMEOUT_MS = 4000;

export default function SettingsScreen() {
  const [settings, setSettings] = useState<ConnectionSettings>(DEFAULT_SETTINGS);
  const [brainStatus, setBrainStatus] = useState<TestStatus>("idle");
  const [espStatus, setEspStatus] = useState<TestStatus>("idle");

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const handleSave = async () => {
    await saveSettings(settings);
  };

  const testBrainConnection = async () => {
    setBrainStatus("testing");
    try {
      await checkHealth(brainBaseUrl(settings));
      setBrainStatus("ok");
    } catch {
      setBrainStatus("failed");
    }
  };

  const testEspConnection = () => {
    setEspStatus("testing");
    const socket = new ESPSocket(settings.espHost, Number(settings.espPort) || 81, (state) => {
      if (state === "connected") {
        setEspStatus("ok");
        socket.disconnect();
      }
    });
    socket.connect();

    setTimeout(() => {
      setEspStatus((current) => (current === "testing" ? "failed" : current));
      socket.disconnect();
    }, ESP_TEST_TIMEOUT_MS);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Brain server IP</Text>
      <TextInput
        style={styles.input}
        placeholder="192.168.1.42"
        value={settings.brainHost}
        onChangeText={(brainHost) => setSettings({ ...settings, brainHost })}
        autoCapitalize="none"
      />
      <Text style={styles.label}>Brain server port</Text>
      <TextInput
        style={styles.input}
        value={settings.brainPort}
        onChangeText={(brainPort) => setSettings({ ...settings, brainPort })}
        keyboardType="number-pad"
      />
      <Button title="Test brain connection" onPress={testBrainConnection} />
      <Text style={styles.status}>Brain: {brainStatus}</Text>

      <Text style={styles.label}>ESP32 IP</Text>
      <TextInput
        style={styles.input}
        placeholder="192.168.1.99"
        value={settings.espHost}
        onChangeText={(espHost) => setSettings({ ...settings, espHost })}
        autoCapitalize="none"
      />
      <Text style={styles.label}>ESP32 WebSocket port</Text>
      <TextInput
        style={styles.input}
        value={settings.espPort}
        onChangeText={(espPort) => setSettings({ ...settings, espPort })}
        keyboardType="number-pad"
      />
      <Button title="Test ESP32 connection" onPress={testEspConnection} />
      <Text style={styles.status}>ESP32: {espStatus}</Text>

      <Button title="Save settings" onPress={handleSave} />

      <Text style={styles.label}>Safety</Text>
      <Text style={styles.safetyText}>{DISCLAIMER_TEXT}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 8 },
  label: { fontWeight: "600", marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
  },
  status: { color: "#555", marginBottom: 8 },
  safetyText: { color: "#555", fontSize: 13 },
});
