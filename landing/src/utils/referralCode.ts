import { PENDING_REFERRAL_CODE_KEY } from "config/localStorage";
import { MAX_REFERRAL_CODE_LENGTH, REFERRAL_CODE_QUERY_PARAM } from "lib/legacy";

import { getLandingUrlSearch } from "./landingUrlSearch";

export function captureLandingReferralCode(): void {
  const ref = getLandingUrlSearch().get(REFERRAL_CODE_QUERY_PARAM);

  if (!ref || ref.length === 0 || ref.length > MAX_REFERRAL_CODE_LENGTH) return;

  try {
    window.localStorage.setItem(PENDING_REFERRAL_CODE_KEY, ref);
  } catch {
    // noop
  }
}

export function getLandingReferralCode(): string | null {
  try {
    const stored = window.localStorage.getItem(PENDING_REFERRAL_CODE_KEY);
    if (!stored || stored.length === 0 || stored.length > MAX_REFERRAL_CODE_LENGTH) {
      return null;
    }
    return stored;
  } catch {
    return null;
  }
}
