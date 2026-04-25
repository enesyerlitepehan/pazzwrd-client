import RNAsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

// Centralized, user-scoped storage utilities used across the app

// Keys persisted in SecureStore without prefix (with migration support)
const SENSITIVE_KEYS = new Set(["activeUserId", "knownUsers", "accessToken", "refreshToken"]);

let activeUserIdCache: string | null = null;
let userPrefixCache: string | null = null;

export function clearActiveUserContextGlobal(): void {
  activeUserIdCache = null;
  userPrefixCache = null;
}

async function prefixForUser(userId: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, userId);
  return `u_${hash.slice(0, 24)}_`;
}

export async function getActiveUserIdGlobal(): Promise<string | null> {
  if (activeUserIdCache !== null) return activeUserIdCache;
  try {
    const id = await SecureStore.getItemAsync("activeUserId");
    activeUserIdCache = id;
    if (id) userPrefixCache = await prefixForUser(id);
    return id;
  } catch {
    return null;
  }
}

async function addKnownUserGlobal(email: string) {
  try {
    const raw = await SecureStore.getItemAsync("knownUsers");
    let users: string[] = [];
    if (raw) {
      try {
        users = JSON.parse(raw);
      } catch {
        users = [];
      }
    }
    if (!Array.isArray(users)) users = [];
    if (!users.includes(email)) {
      users.push(email);
      await SecureStore.setItemAsync("knownUsers", JSON.stringify(users));
    }
  } catch {}
}

export async function setActiveUserIdGlobal(email: string) {
  await SecureStore.setItemAsync("activeUserId", email);
  activeUserIdCache = email;
  userPrefixCache = await prefixForUser(email);
  await addKnownUserGlobal(email);
}

export async function getUserPrefix(): Promise<string | null> {
  const id = await getActiveUserIdGlobal();
  if (!id) return null;
  return userPrefixCache || (userPrefixCache = await prefixForUser(id));
}

export async function getLegacyUserPrefix(): Promise<string | null> {
  // Kept for compatibility where referenced, but not used for migrations.
  const id = await getActiveUserIdGlobal();
  if (!id) return null;
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, id);
  return `u:${hash.slice(0, 24)}:`;
}

export const AsyncStorage = {
  getItem: async (key: string) => {
    // Sensitive items: store in SecureStore unprefixed (no migrations)
    if (SENSITIVE_KEYS.has(key)) {
      try {
        return await SecureStore.getItemAsync(key);
      } catch {
        return null;
      }
    }

    // Bulk items: RN AsyncStorage with per-user prefix (no migrations)
    const prefix = await getUserPrefix();
    if (!prefix) {
      return RNAsyncStorage.getItem(key);
    }
    return RNAsyncStorage.getItem(prefix + key);
  },
  setItem: async (key: string, value: string) => {
    if (SENSITIVE_KEYS.has(key)) {
      return SecureStore.setItemAsync(key, value);
    }
    const prefix = await getUserPrefix();
    if (!prefix) {
      return RNAsyncStorage.setItem(key, value);
    }
    return RNAsyncStorage.setItem(prefix + key, value);
  },
  removeItem: async (key: string) => {
    if (SENSITIVE_KEYS.has(key)) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {}
      return;
    }
    const prefix = await getUserPrefix();
    const storageKey = prefix ? prefix + key : key;
    try {
      await RNAsyncStorage.removeItem(storageKey);
    } catch {}
  },
};

// Convenience direct exports matching previous minimal helper signature
export async function getItem(key: string) {
  return AsyncStorage.getItem(key);
}
export async function setItem(key: string, value: string) {
  return AsyncStorage.setItem(key, value);
}
export async function removeItem(key: string) {
  return AsyncStorage.removeItem(key);
}
