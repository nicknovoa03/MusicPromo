import * as SecureStore from "expo-secure-store";
import { TokenCache } from "@clerk/clerk-expo";

const createTokenCache = (): TokenCache => ({
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      return item;
    } catch {
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, token: string) {
    await SecureStore.setItemAsync(key, token);
  },
  async clearToken(key: string) {
    await SecureStore.deleteItemAsync(key);
  },
});

export const tokenCache = createTokenCache();
