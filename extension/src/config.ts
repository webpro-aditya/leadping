export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:8000/api';

export const DASHBOARD_BASE_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DASHBOARD_URL) ||
  'http://localhost:5173'
).replace(/\/+$/, '');

export function openDashboardPath(path: string): void {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const targetUrl = `${DASHBOARD_BASE_URL}${normalizedPath}`;

  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    chrome.tabs.create({ url: targetUrl });
  } else {
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }
}
