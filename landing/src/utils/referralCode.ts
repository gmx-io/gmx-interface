import { PENDING_REFERRAL_CODE_KEY } from "config/localStorage";
import { isReferralCodeQueryParam } from "domain/referrals/utils/referralCode";
import { REFERRAL_CODE_QUERY_PARAM } from "lib/legacy";

import { getLandingUrlSearch } from "./landingUrlSearch";

export function captureLandingReferralCode(): void {
  const ref = getLandingUrlSearch().get(REFERRAL_CODE_QUERY_PARAM);

  if (!isReferralCodeQueryParam(ref)) return;

  try {
    window.localStorage.setItem(PENDING_REFERRAL_CODE_KEY, ref);
  } catch {
    // noop
  }
}

export function getLandingReferralCode(): string | null {
  try {
    const stored = window.localStorage.getItem(PENDING_REFERRAL_CODE_KEY);
    return isReferralCodeQueryParam(stored) ? stored : null;
  } catch {
    return null;
  }
}
