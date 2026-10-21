const COOKIE_PREFIX = "gmx_analytics_";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function canShareAnalyticsStorage() {
  const hostname = window.location.hostname;
  return hostname === "gmx.io" || hostname.endsWith(".gmx.io");
}

export function getSharedAnalyticsValue(key: string): string | undefined {
  if (!canShareAnalyticsStorage()) return undefined;

  try {
    const prefix = `${COOKIE_PREFIX}${key}=`;
    const cookie = document.cookie.split("; ").find((item) => item.startsWith(prefix));
    return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : undefined;
  } catch {
    return undefined;
  }
}

export function setSharedAnalyticsValue(key: string, value: string) {
  if (!canShareAnalyticsStorage() || getSharedAnalyticsValue(key) === value) return;

  try {
    document.cookie = `${COOKIE_PREFIX}${key}=${encodeURIComponent(value)}; Domain=gmx.io; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax; Secure`;
  } catch {
    // URL forwarding still works when cookies are unavailable.
  }
}
