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
import { SHOW_DEBUG_VALUES_KEY } from "config/localStorage";
import { useLocalStorageSerializeKey } from "lib/localStorage";

export function useConfigureUserAnalyticsProfile() {
  const history = useHistory();
  const query = useRouteQuery();
  const currentLanguage = useLingui().i18n.locale;
  const referralCode = useReferralCodeFromUrl();
  const utmParams = useUtmParams();
  const [showDebugValues] = useLocalStorageSerializeKey(SHOW_DEBUG_VALUES_KEY, false);
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

  useEffect(() => {
    let sessionIdParam = query.get(SESSION_ID_KEY);
    if (sessionIdParam) {
      userAnalytics.setSessionId(sessionIdParam);
      const urlParams = new URLSearchParams(history.location.search);
      if (urlParams.has(SESSION_ID_KEY)) {
        urlParams.delete(SESSION_ID_KEY);
        history.replace({
          search: urlParams.toString(),
        });
      }
    }
  }, [query, history]);

  useEffect(() => {
    const bowser = Bowser.parse(window.navigator.userAgent);

    const browserName = bowser.browser.name;
    const platform = bowser.platform.type;

    userAnalytics.setCommonEventParams({
      platform,
      browserName,
      ordersCount,
      isWalletConnected: active,
      isTest: isDevelopment(),
      isInited: Boolean(browserName && platform),
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

  useEffect(() => {
    userAnalytics.setDebug(showDebugValues || false);
  }, [showDebugValues]);
}
