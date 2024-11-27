import { REFERRAL_CODE_QUERY_PARAM } from "lib/legacy";
import useRouteQuery from "lib/useRouteQuery";
import { useMemo } from "react";

export function useReferralCodeFromUrl() {
  const query = useRouteQuery();

  return useMemo(() => {
    let referralCode = query.get(REFERRAL_CODE_QUERY_PARAM);
    if (!referralCode || referralCode.length === 0) {
      const params = new URLSearchParams(window.location.search);
      referralCode = params.get(REFERRAL_CODE_QUERY_PARAM);
    }

    if (referralCode && referralCode.length < 20) {
      return referralCode;
    }

    return undefined;
  }, [query]);
}
