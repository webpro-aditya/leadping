const TRACKING_QUERY_PARAMS = new Set([
  'ncid', 'fbclid', 'gclid', 'yclid', 'dclid', 'msclkid',
  'mc_cid', 'mc_eid', 'ref', 'ref_src', '_hsenc', '_hsmi', 'igshid',
]);

/**
 * Return a safe http(s) URL for anchor hrefs, rejecting dangerous schemes (e.g. javascript:, data:).
 */
export function safeExternalUrl(rawUrl?: string | null): string | undefined {
  if (!rawUrl) return undefined;
  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;

  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return undefined;
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

/**
 * Normalize target URLs (strip fragments, tracking params, trailing slash) to maximize cache hits.
 */
export function normalizeTargetUrl(rawUrl?: string | null): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    const params = new URLSearchParams(parsed.search);
    for (const key of Array.from(params.keys())) {
      const lower = key.toLowerCase();
      if (lower.startsWith('utm_') || TRACKING_QUERY_PARAMS.has(lower)) {
        params.delete(key);
      }
    }

    const sortedEntries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
    const cleanParams = new URLSearchParams(sortedEntries);
    const query = cleanParams.toString();
    const path = parsed.pathname !== '/' ? parsed.pathname.replace(/\/+$/, '') : '/';

    return `${parsed.protocol.toLowerCase()}//${parsed.host.toLowerCase()}${path}${query ? `?${query}` : ''}`;
  } catch {
    return trimmed;
  }
}
