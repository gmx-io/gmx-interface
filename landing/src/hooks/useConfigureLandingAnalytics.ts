import { useLingui } from "@lingui/react";
import { getLandingReferralCode } from "landing/utils/referralCode";
import { useEffect } from "react";

import { getAbFlags } from "config/ab";
import { isDevelopment } from "config/env";
import { useUtmParams } from "domain/utm";
import { metrics } from "lib/metrics/Metrics";
import { getDisplayMode } from "lib/pwa/getDisplayMode";
import { useBowser } from "lib/useBowser";
import { userAnalytics } from "lib/userAnalytics/UserAnalytics";

export function useConfigureLandingAnalytics() {
  const languageCode = useLingui().i18n.locale;
  const utmParams = useUtmParams();
  const { data: bowser } = useBowser();

  useEffect(() => {
    metrics.setGlobalMetricData({
      isHomeSite: true,
      isInited: true,
      abFlags: getAbFlags(),
      browserName: bowser?.browser.name,
      browserVersion: bowser?.browser.version,
      platform: bowser?.platform.type,
    });
    userAnalytics.setCommonEventParams({
      displayMode: getDisplayMode(),
      platform: bowser?.platform.type,
      browserName: bowser?.browser.name,
      isTest: isDevelopment(),
      isInited: true,
      ...getAbFlags(),
    });
  }, [bowser]);

  useEffect(() => {
    userAnalytics.pushProfileProps({ languageCode, ref: getLandingReferralCode() ?? undefined });
  }, [languageCode, utmParams?.utmString]);
}
