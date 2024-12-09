import { useLingui } from "@lingui/react";
import Bowser from "bowser";
import { useAccountStats, usePeriodAccountStats } from "domain/synthetics/accountStats";
import { useChainId } from "lib/chains";
import { getTimePeriodsInSeconds } from "lib/dates";
import useWallet from "lib/wallets/useWallet";
import { useEffect, useMemo } from "react";
import { SESSION_ID_KEY, userAnalytics } from "./UserAnalytics";
import { formatAmountForMetrics } from "lib/metrics";
import { USD_DECIMALS } from "config/factors";
import { useReferralCodeFromUrl } from "domain/referrals";
import { useUtmParams } from "domain/utm";
import { isDevelopment } from "config/env";
import useRouteQuery from "lib/useRouteQuery";
import { useHistory } from "react-router-dom";
import { AbFlag, getAbFlags, getIsFlagEnabled, setAbFlagEnabled } from "config/ab";

export function useConfigureUserAnalyticsProfile() {
  const history = useHistory();
  const query = useRouteQuery();
  const currentLanguage = useLingui().i18n.locale;
  const referralCode = useReferralCodeFromUrl();
  const utmParams = useUtmParams();
  const { chainId } = useChainId();
  const { account, active } = useWallet();

  const timePeriods = useMemo(() => getTimePeriodsInSeconds(), []);

  const { data: lastMonthAccountStats } = usePeriodAccountStats(chainId, {
    account,
    from: timePeriods.month[0],
    to: timePeriods.month[1],
    enabled: true,
  });

  const { data: accountStats } = useAccountStats(chainId, {
    account,
    enabled: true,
  });

  const last30DVolume = lastMonthAccountStats?.volume;
  const totalVolume = accountStats?.volume;
  const ordersCount = accountStats?.closedCount;

  useEffect(
    function handleUrlParamsEff() {
      let isUrlParamsChanged = false;

      const sessionIdParam = query.get(SESSION_ID_KEY);

      if (sessionIdParam) {
        userAnalytics.setSessionId(sessionIdParam);
        query.delete(SESSION_ID_KEY);
        isUrlParamsChanged = true;
      }

      const abFlags = getAbFlags();

      Object.keys(abFlags).forEach((flag) => {
        const urlFlagValue = query.get(flag);
        if (urlFlagValue) {
          setAbFlagEnabled(flag as AbFlag, urlFlagValue === "1");
          query.delete(flag);
          isUrlParamsChanged = true;
        }
      });

      if (isUrlParamsChanged) {
        history.replace({
          search: query.toString(),
        });
      }
    },
    [query, history]
  );

  useEffect(() => {
    const bowser = Bowser.parse(window.navigator.userAgent);

    userAnalytics.setCommonEventParams({
      platform: bowser.platform.type,
      browserName: bowser.browser.name,
      ordersCount,
      isWalletConnected: active,
      isTest: isDevelopment(),
      ABTestAgreementConfirmation: getIsFlagEnabled("testRemoveConfirmationModal") ? "Experimental" : "Control",
    });
  }, [active, ordersCount]);

  useEffect(() => {
    if (last30DVolume === undefined || totalVolume === undefined) {
      return;
    }

    userAnalytics.pushProfileProps({
      last30DVolume: formatAmountForMetrics(last30DVolume, USD_DECIMALS, "toSecondOrderInt"),
      totalVolume: formatAmountForMetrics(totalVolume, USD_DECIMALS, "toSecondOrderInt"),
      languageCode: currentLanguage,
      ref: referralCode,
      utm: utmParams?.utmString,
    });
  }, [currentLanguage, last30DVolume, totalVolume, referralCode, utmParams?.utmString]);
}
