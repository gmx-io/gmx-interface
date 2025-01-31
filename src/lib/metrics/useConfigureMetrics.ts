import { getAbFlags } from "config/ab";
import { SHOW_DEBUG_VALUES_KEY } from "config/localStorage";
import { getIsLargeAccount } from "domain/stats/isLargeAccount";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useBowser } from "lib/useBowser";
import useIsWindowVisible from "lib/useIsWindowVisible";
import useIsMetamaskMobile, { getIsMobileUserAgent } from "lib/wallets/useIsMetamaskMobile";
import useWallet from "lib/wallets/useWallet";
import { useEffect } from "react";
import { isHomeSite } from "../legacy";
import { metrics } from "./Metrics";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";

export function useConfigureMetrics() {
  const { chainId } = useChainId();
  const fetcher = useOracleKeeperFetcher(chainId);
  const { active } = useWallet();
  const [showDebugValues] = useLocalStorageSerializeKey(SHOW_DEBUG_VALUES_KEY, false);
  const isMobileMetamask = useIsMetamaskMobile();
  const isWindowVisible = useIsWindowVisible();
  const isLargeAccount = getIsLargeAccount();
  const { data: bowser } = useBowser();

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
    metrics.setGlobalMetricData({
      isMobileMetamask,
      isWindowVisible,
      isAuthorised: active,
      abFlags: getAbFlags(),
      isMobile: getIsMobileUserAgent(),
      isHomeSite: isHomeSite(),
      isLargeAccount,
      browserName: bowser?.browser.name,
      browserVersion: bowser?.browser.version,
      platform: bowser?.platform.type,
      isInited: Boolean(bowser),
    });
  }, [active, isMobileMetamask, isWindowVisible, isLargeAccount, bowser]);

  useEffect(() => {
    metrics.updateWalletNames();
  }, [active]);
}
