import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const PREFIX = "holadoc_";

/**
 * Cross-platform secure storage: SecureStore on native, localStorage on web
 * (expo-secure-store is not available on web).
 */
export async function setItemAsync(key, value) {
  if (Platform.OS === "web") {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(PREFIX + key, value);
      }
    } catch (e) {
      throw e;
    }
    return;
  }
  return SecureStore.setItemAsync(key, value);
}

export async function getItemAsync(key) {
  if (Platform.OS === "web") {
    try {
      return typeof localStorage !== "undefined"
        ? localStorage.getItem(PREFIX + key)
        : null;
    } catch (e) {
      console.warn(`[secureStorage] getItemAsync(${key}) failed:`, e);
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export async function deleteItemAsync(key) {
  if (Platform.OS === "web") {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(PREFIX + key);
      }
    } catch (e) {
      console.warn(`[secureStorage] deleteItemAsync(${key}) failed:`, e);
    }
    return;
  }
  return SecureStore.deleteItemAsync(key);
}
