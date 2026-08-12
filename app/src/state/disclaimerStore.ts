import AsyncStorage from "@react-native-async-storage/async-storage";

const ACKNOWLEDGED_KEY = "duo.settings.disclaimerAcknowledged";

export const DISCLAIMER_TEXT =
  "DUO provides wellness and companionship support only and is not intended for medical use or diagnosis.";

export async function hasAcknowledgedDisclaimer(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ACKNOWLEDGED_KEY);
  return value === "true";
}

export async function acknowledgeDisclaimer(): Promise<void> {
  await AsyncStorage.setItem(ACKNOWLEDGED_KEY, "true");
}
