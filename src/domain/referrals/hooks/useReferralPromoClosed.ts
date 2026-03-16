import { useCallback } from "react";

import { useLocalStorageSerializeKeySafe } from "lib/localStorage";

const REFERRAL_PROMO_CLOSED_KEY = "referrals-promo-closed";

export type ReferralPromoId = "trader" | "affiliate";

function getReferralPromoClosedKey(promoId: ReferralPromoId, account: string | undefined): (string | undefined)[] {
  return [REFERRAL_PROMO_CLOSED_KEY, promoId, account ?? "anonymous"];
}

export function useReferralPromoClosed(promoId: ReferralPromoId, account: string | undefined) {
  const storageKey = getReferralPromoClosedKey(promoId, account);
  const [isClosed, setIsClosed] = useLocalStorageSerializeKeySafe<boolean>(storageKey, false);

  const close = useCallback(() => {
    setIsClosed(true);
  }, [setIsClosed]);

  return { isClosed: isClosed ?? false, close };
}
