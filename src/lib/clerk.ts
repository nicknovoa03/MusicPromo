import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { TokenCache } from "@clerk/clerk-expo";

function createSecureStoreCache(): TokenCache {
  return {
    async getToken(key: string) {
      try {
        return await SecureStore.getItemAsync(key);
      } catch (error) {
        console.warn(`Failed to retrieve token for key "${key}":`, error);
        try {
          await SecureStore.deleteItemAsync(key);
        } catch {}
        return null;
      }
    },
    async saveToken(key: string, token: string) {
      await SecureStore.setItemAsync(key, token);
    },
    async clearToken(key: string) {
      await SecureStore.deleteItemAsync(key);
    },
  };
}

function createWebTokenCache(): TokenCache {
  return {
    async getToken(key: string) {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    async saveToken(key: string, token: string) {
      globalThis.localStorage?.setItem(key, token);
    },
    async clearToken(key: string) {
      globalThis.localStorage?.removeItem(key);
    },
  };
}

export const tokenCache =
  Platform.OS === "web" ? createWebTokenCache() : createSecureStoreCache();
