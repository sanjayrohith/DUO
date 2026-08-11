import AsyncStorage from "@react-native-async-storage/async-storage";

const BRAIN_HOST_KEY = "duo.settings.brainHost";
const BRAIN_PORT_KEY = "duo.settings.brainPort";
const ESP_HOST_KEY = "duo.settings.espHost";
const ESP_PORT_KEY = "duo.settings.espPort";

export interface ConnectionSettings {
  brainHost: string;
  brainPort: string;
  espHost: string;
  espPort: string;
}

export const DEFAULT_SETTINGS: ConnectionSettings = {
  brainHost: "",
  brainPort: "8000",
  espHost: "",
  espPort: "81",
};

export async function loadSettings(): Promise<ConnectionSettings> {
  const entries = await AsyncStorage.multiGet([
    BRAIN_HOST_KEY,
    BRAIN_PORT_KEY,
    ESP_HOST_KEY,
    ESP_PORT_KEY,
  ]);
  const values = Object.fromEntries(entries);
  return {
    brainHost: values[BRAIN_HOST_KEY] ?? DEFAULT_SETTINGS.brainHost,
    brainPort: values[BRAIN_PORT_KEY] ?? DEFAULT_SETTINGS.brainPort,
    espHost: values[ESP_HOST_KEY] ?? DEFAULT_SETTINGS.espHost,
    espPort: values[ESP_PORT_KEY] ?? DEFAULT_SETTINGS.espPort,
  };
}

export async function saveSettings(settings: ConnectionSettings): Promise<void> {
  await AsyncStorage.multiSet([
    [BRAIN_HOST_KEY, settings.brainHost],
    [BRAIN_PORT_KEY, settings.brainPort],
    [ESP_HOST_KEY, settings.espHost],
    [ESP_PORT_KEY, settings.espPort],
  ]);
}

export function brainBaseUrl(settings: ConnectionSettings): string {
  return `http://${settings.brainHost}:${settings.brainPort}`;
}
