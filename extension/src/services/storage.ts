// ============================================================
// Chrome Storage wrapper — stores auth tokens and bounded 24h analysis cache
// ============================================================

import type { CompanyAnalysis } from '../types';
import { normalizeTargetUrl } from '../utils/url';

const STORAGE_KEYS = {
  AUTH_TOKEN: 'leadping_auth_token',
  USER: 'leadping_user',
  SAVED_ANALYSES: 'leadping_saved_analyses',
} as const;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHED_ANALYSES = 50;

interface CachedAnalysisEntry {
  url: string;
  cachedAt: number;
  data: CompanyAnalysis;
}

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

function readAnalysesCacheMap(): Promise<Record<string, CachedAnalysisEntry>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.SAVED_ANALYSES, (result) => {
      const raw = result[STORAGE_KEYS.SAVED_ANALYSES];
      resolve(raw && typeof raw === 'object' ? (raw as Record<string, CachedAnalysisEntry>) : {});
    });
  });
}

function writeAnalysesCacheMap(map: Record<string, CachedAnalysisEntry>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEYS.SAVED_ANALYSES]: map }, resolve);
  });
}

export async function getCachedAnalysis(rawUrl: string): Promise<CompanyAnalysis | null> {
  const normalized = normalizeTargetUrl(rawUrl);
  if (!normalized) return null;

  const map = await readAnalysesCacheMap();
  const entry = map[normalized];
  if (!entry) return null;

  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    delete map[normalized];
    await writeAnalysesCacheMap(map);
    return null;
  }

  return entry.data;
}

export async function setCachedAnalysis(rawUrl: string, data: CompanyAnalysis): Promise<void> {
  const normalized = normalizeTargetUrl(rawUrl);
  if (!normalized) return;

  const map = await readAnalysesCacheMap();
  const now = Date.now();

  // Prune expired entries and enforce bounded LRU capacity
  const freshEntries = Object.entries(map)
    .filter(([key, val]) => key !== normalized && val && now - val.cachedAt <= CACHE_TTL_MS)
    .sort((a, b) => b[1].cachedAt - a[1].cachedAt)
    .slice(0, MAX_CACHED_ANALYSES - 1);

  const nextMap: Record<string, CachedAnalysisEntry> = {
    [normalized]: { url: normalized, cachedAt: now, data },
  };
  for (const [k, v] of freshEntries) {
    nextMap[k] = v;
  }

  await writeAnalysesCacheMap(nextMap);
}

export async function clearAllStorage(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(
      Object.values(STORAGE_KEYS),
      resolve
    );
  });
}
