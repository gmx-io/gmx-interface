import { useLingui } from "@lingui/react";
import { useEffect, useMemo } from "react";
import { useHistory } from "react-router-dom";

import { AbFlag, getAbFlags, setAbFlagEnabled } from "config/ab";
import { isDevelopment } from "config/env";
import { USD_DECIMALS } from "config/factors";
import { SHOW_DEBUG_VALUES_KEY } from "config/localStorage";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useReferralCodeFromUrl } from "domain/referrals";
import { useAccountStats, usePeriodAccountStats } from "domain/synthetics/accountStats";
import { useUtmParams } from "domain/utm";
import { useChainId } from "lib/chains";
import { getTimePeriodsInSeconds } from "lib/dates";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatAmountForMetrics } from "lib/metrics";
import { useBowser } from "lib/useBowser";
import useRouteQuery from "lib/useRouteQuery";
import useWallet from "lib/wallets/useWallet";

import { SESSION_ID_KEY, userAnalytics } from "./UserAnalytics";
import { useSubmitButtonState } from "components/Synthetics/GmSwap/GmSwapBox/GmDepositWithdrawalBox/useSubmitButtonState";
import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";

export function useConfigureUserAnalyticsProfile() {
  const history = useHistory();
  const query = useRouteQuery();
  const currentLanguage = useLingui().i18n.locale;
  const referralCode = useReferralCodeFromUrl();
  const utmParams = useUtmParams();
  const [showDebugValues] = useLocalStorageSerializeKey(SHOW_DEBUG_VALUES_KEY, false);
  const { chainId } = useChainId();
  const { account, active } = useWallet();
  const { data: bowser } = useBowser();
  const { shouldShowPositionLines, expressOrdersEnabled } = useSettings();
  const { subaccount } = useSubaccountContext();

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
    userAnalytics.setCommonEventParams({
      platform: bowser?.platform.type,
      browserName: bowser?.browser.name,
      ordersCount,
      isWalletConnected: active,
      isTest: isDevelopment(),
      isInited: Boolean(bowser),
      ...getAbFlags(),
    });
  }, [active, ordersCount, bowser]);

  useEffect(() => {
    if (last30DVolume === undefined || totalVolume === undefined) {
      return;
    }

    userAnalytics.pushProfileProps({
      last30DVolume: formatAmountForMetrics(last30DVolume, USD_DECIMALS, "toSecondOrderInt"),
      totalVolume: formatAmountForMetrics(totalVolume, USD_DECIMALS, "toSecondOrderInt"),
      languageCode: currentLanguage,
      isChartPositionsEnabled: shouldShowPositionLines,
      ref: referralCode,
      utm: utmParams?.utmString,
      ExpressEnabled: expressOrdersEnabled,
      Express1CTEnabled: Boolean(subaccount),
    });
  }, [
    currentLanguage,
    last30DVolume,
    totalVolume,
    referralCode,
    utmParams?.utmString,
    shouldShowPositionLines,
    expressOrdersEnabled,
    subaccount,
  ]);

  useEffect(() => {
    userAnalytics.setDebug(showDebugValues || false);
  }, [showDebugValues]);
}
