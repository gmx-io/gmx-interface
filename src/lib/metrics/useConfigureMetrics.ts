import { getAbFlags } from "config/ab";
import { SHOW_DEBUG_VALUES_KEY } from "config/localStorage";
import { useOracleKeeperFetcher } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import useIsWindowVisible from "lib/useIsWindowVisible";
import useIsMetamaskMobile, { getIsMobileUserAgent } from "lib/wallets/useIsMetamaskMobile";
import useWallet from "lib/wallets/useWallet";
import Bowser from "bowser";
import { useEffect } from "react";
import { metrics } from "./Metrics";
import { isHomeSite } from "../legacy";
import { getIsLargeAccount } from "domain/stats/isLargeAccount";

export function useConfigureMetrics() {
  const { chainId } = useChainId();
  const fetcher = useOracleKeeperFetcher(chainId);
  const { active } = useWallet();
  const [showDebugValues] = useLocalStorageSerializeKey(SHOW_DEBUG_VALUES_KEY, false);
  const isMobileMetamask = useIsMetamaskMobile();
  const isWindowVisible = useIsWindowVisible();
  const isLargeAccount = getIsLargeAccount();

  useEffect(() => {
    metrics.subscribeToEvents();
    return () => {
      metrics.unsubscribeFromEvents();
    };
  }, []);

  useEffect(() => {
    metrics.setFetcher(fetcher);
  }, [fetcher]);

  useEffect(() => {
    metrics.setDebug(showDebugValues || false);
  }, [showDebugValues]);

  useEffect(() => {
    const bowser = Bowser.parse(window.navigator.userAgent);

    const browserName = bowser.browser.name;
    const browserVersion = bowser.browser.version;
    const platform = bowser.platform.type;

    metrics.setGlobalMetricData({
      isMobileMetamask,
      isWindowVisible,
      isAuthorised: active,
      abFlags: getAbFlags(),
      isMobile: getIsMobileUserAgent(),
      isHomeSite: isHomeSite(),
      isLargeAccount,
      browserName,
      browserVersion,
      platform,
      isInited: Boolean(browserName && browserVersion && platform),
    });
  }, [active, isMobileMetamask, isWindowVisible, isLargeAccount]);

  useEffect(() => {
    metrics.updateWalletNames();
  }, [active]);
}
