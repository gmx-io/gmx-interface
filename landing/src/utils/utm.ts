import { UTM_PARAMS_KEY } from "config/localStorage";

import { getLandingUrlSearch } from "./landingUrlSearch";

const UTM_KEYS = ["source", "medium", "campaign", "term", "content"] as const;
const MAX_UTM_VALUE_LENGTH = 50;

type UtmKey = (typeof UTM_KEYS)[number];
type UtmParams = Partial<Record<UtmKey, string>> & { utmString?: string };

// Writes in the same shape/key as src/domain/utm so the main app's
// getStoredUtmParams() in getSessionForwardParams() picks it up unchanged.
export function captureLandingUtmParams(): void {
  const search = getLandingUrlSearch();

  const utmParams: UtmParams = {};
  for (const key of UTM_KEYS) {
    const value = search.get(`utm_${key}`);
    if (value && value.length > 0 && value.length < MAX_UTM_VALUE_LENGTH) {
      utmParams[key] = value;
    }
  }

  if (Object.keys(utmParams).length === 0) return;

  utmParams.utmString = UTM_KEYS.filter((key) => utmParams[key] !== undefined)
    .map((key) => `utm_${key}=${utmParams[key]}`)
    .join("&");

  try {
    window.localStorage.setItem(UTM_PARAMS_KEY, JSON.stringify(utmParams));
  } catch {
    // noop
  }
}
