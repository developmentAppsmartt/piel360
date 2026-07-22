import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { AuthUser } from '../types/auth';

const KEYS = {
  accessToken: 'piel360_access_token',
  refreshToken: 'piel360_refresh_token',
  user: 'piel360_user',
} as const;

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const storageService = {
  async saveSession(params: {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  }): Promise<void> {
    await Promise.all([
      setItem(KEYS.accessToken, params.accessToken),
      setItem(KEYS.refreshToken, params.refreshToken),
      setItem(KEYS.user, JSON.stringify(params.user)),
    ]);
  },

  async getAccessToken(): Promise<string | null> {
    return getItem(KEYS.accessToken);
  },

  async getRefreshToken(): Promise<string | null> {
    return getItem(KEYS.refreshToken);
  },

  async getUser(): Promise<AuthUser | null> {
    const raw = await getItem(KEYS.user);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  async clearSession(): Promise<void> {
    await Promise.all([
      deleteItem(KEYS.accessToken),
      deleteItem(KEYS.refreshToken),
      deleteItem(KEYS.user),
    ]);
  },
};
