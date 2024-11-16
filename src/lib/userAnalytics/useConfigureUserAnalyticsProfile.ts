import { useLingui } from "@lingui/react";
import Bowser from "bowser";
import { useAccountStats, usePeriodAccountStats } from "domain/synthetics/accountStats";
import { useChainId } from "lib/chains";
import { getTimePeriodsInSeconds } from "lib/dates";
import useWallet from "lib/wallets/useWallet";
import { useEffect, useMemo } from "react";
import { userAnalytics } from "./UserAnalytics";
import { formatAmountForMetrics } from "lib/metrics";
import { USD_DECIMALS } from "config/factors";
import { useReferralCodeFromUrl } from "domain/referrals";
import { useUtmParams } from "domain/utm";

export function useConfigureUserAnalyticsProfile() {
  const currentLanguage = useLingui().i18n.locale;
  const referralCode = useReferralCodeFromUrl();
  const utmParams = useUtmParams();
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

    userAnalytics.setCommonEventParams({
      platform: bowser.platform.type,
      ordersCount,
      isWalletConnected: active,
    });
  }, [active, ordersCount]);

  useEffect(() => {
    userAnalytics.pushProfileProps({
      last30DVolume: formatAmountForMetrics(last30DVolume, USD_DECIMALS, "toSecondOrderInt"),
      totalVolume: formatAmountForMetrics(totalVolume, USD_DECIMALS, "toSecondOrderInt"),
      languageCode: currentLanguage,
      ref: referralCode,
      utm: utmParams?.utmString,
    });
  }, [currentLanguage, last30DVolume, totalVolume, referralCode, utmParams?.utmString]);
}
