import { useLingui } from "@lingui/react";
import Bowser from "bowser";
import { USD_DECIMALS } from "config/factors";
import { useAccountStats, usePeriodAccountStats } from "domain/synthetics/accountStats";
import { useChainId } from "lib/chains";
import { getTimePeriodsInSeconds } from "lib/dates";
import { REFERRAL_CODE_QUERY_PARAM } from "lib/legacy";
import useRouteQuery from "lib/useRouteQuery";
import useWallet from "lib/wallets/useWallet";
import { useEffect, useMemo } from "react";
import { formatAmountForMetrics } from ".";
import { metrics } from "./Metrics";

export function useSetMetricsProfileProperties() {
  const currentLanguage = useLingui().i18n.locale;
  const query = useRouteQuery();
  const { chainId } = useChainId();
  const { account, active } = useWallet();

  //   const [isSettled] = useState(false);
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
    const bowser = Bowser.parse(window.navigator.userAgent);

    metrics.setCommonUserParams({
      platform: bowser.platform.type,
      ordersCount,
      isWalletConnected: active,
    });
  }, [active, ordersCount]);

  useEffect(() => {
    if (lastMonthAccountStats && accountStats) {
      let referralCode = query.get(REFERRAL_CODE_QUERY_PARAM);
      if (!referralCode || referralCode.length === 0) {
        const params = new URLSearchParams(window.location.search);
        referralCode = params.get(REFERRAL_CODE_QUERY_PARAM);
      }

      if (referralCode?.length && referralCode.length > 20) {
        referralCode = referralCode.substring(0, 20);
      }

      metrics.pushUserProfile({
        last30DVolume: formatAmountForMetrics(last30DVolume, USD_DECIMALS, "toSecondOrderInt"),
        totalVolume: formatAmountForMetrics(totalVolume, USD_DECIMALS, "toSecondOrderInt"),
        languageCode: currentLanguage,
        ref: referralCode,
      });
      //   setIsSettled(true);
    }
  }, [lastMonthAccountStats, accountStats, currentLanguage, last30DVolume, totalVolume, query]);
}
