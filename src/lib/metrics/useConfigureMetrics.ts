import { getIsFlagEnabled } from "config/ab";
import { SHOW_DEBUG_VALUES_KEY } from "config/localStorage";
import { useOracleKeeperFetcher } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import useIsWindowVisible from "lib/useIsWindowVisible";
import useIsMetamaskMobile, { getIsMobileUserAgent } from "lib/wallets/useIsMetamaskMobile";
import useWallet from "lib/wallets/useWallet";
import { useEffect } from "react";
import { metrics } from "./Metrics";

export function useConfigureMetrics() {
  const { chainId } = useChainId();
  const fetcher = useOracleKeeperFetcher(chainId);
  const { active } = useWallet();
  const [showDebugValues] = useLocalStorageSerializeKey(SHOW_DEBUG_VALUES_KEY, false);
  const isMobileMetamask = useIsMetamaskMobile();
  const isWindowVisible = useIsWindowVisible();

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
      testWorkersLogic: getIsFlagEnabled("testWorkerLogic"),
      isMobile: getIsMobileUserAgent(),
    });
  }, [active, isMobileMetamask, isWindowVisible]);
}
