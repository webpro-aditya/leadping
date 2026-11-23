// ============================================================
// Chrome Storage wrapper — stores auth tokens and cached data
// ============================================================

const STORAGE_KEYS = {
  AUTH_TOKEN: 'leadping_auth_token',
  USER: 'leadping_user',
  SAVED_ANALYSES: 'leadping_saved_analyses',
} as const;

export async function getAuthToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.AUTH_TOKEN, (result) => {
      resolve(result[STORAGE_KEYS.AUTH_TOKEN] || null);
    });
  });
}

export async function setAuthToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEYS.AUTH_TOKEN]: token }, resolve);
  });
}

export async function removeAuthToken(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(STORAGE_KEYS.AUTH_TOKEN, resolve);
  });
}

export async function getStoredUser(): Promise<unknown | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.USER, (result) => {
      resolve(result[STORAGE_KEYS.USER] || null);
    });
  });
}

export async function setStoredUser(user: unknown): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEYS.USER]: user }, resolve);
  });
}

export async function removeStoredUser(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(STORAGE_KEYS.USER, resolve);
  });
}

export async function clearAllStorage(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(
      Object.values(STORAGE_KEYS),
      resolve
    );
  });
}
