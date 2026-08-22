// M19: registers this device for real (server-sent) push notifications —
// distinct from utils/localReminders.js, which schedules on-device-only
// notifications and needs no server round-trip or permission-token exchange.
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Requests notification permission (if not already granted) and returns
 * this device's Expo push token, or null if permission was denied / running
 * somewhere a push token isn't obtainable (e.g. web, simulator without
 * push capabilities).
 */
export async function getExpoPushTokenAsync() {
  try {
    if (Platform.OS === "web") return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return null;

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenResponse?.data ?? null;
  } catch (err) {
    // Best-effort — a device that can't get a push token just won't receive
    // real push alerts (e.g. waitlist notifications); it's not fatal.
    console.warn("[pushNotifications] Could not get Expo push token:", err?.message);
    return null;
  }
}
