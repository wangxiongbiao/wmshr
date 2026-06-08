import {Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';

function canUseLocalStorage() {
  return Platform.OS === 'web' && typeof globalThis.localStorage !== 'undefined';
}

export async function getPersistentItem(key: string): Promise<string | null> {
  if (canUseLocalStorage()) {
    try {
      return globalThis.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  return SecureStore.getItemAsync(key).catch(() => null);
}

export async function setPersistentItem(key: string, value: string): Promise<void> {
  if (canUseLocalStorage()) {
    globalThis.localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export async function deletePersistentItem(key: string): Promise<void> {
  if (canUseLocalStorage()) {
    globalThis.localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}
