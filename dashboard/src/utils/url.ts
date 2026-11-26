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
