import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { useChainId } from "lib/chains";
import { usePrevious } from "lib/usePrevious";

import { freshnessMetrics } from "./reportFreshnessMetric";
import { FreshnessMetricId } from "./types";

export function useFreshnessMetricsControl() {
  const location = useLocation();
  const { chainId } = useChainId();
  const prevPathname = usePrevious(location.pathname);
  const prevChainId = usePrevious(chainId);

  useEffect(() => {
    const isTradePage = location.pathname.startsWith("/trade");
    const isRpcDebugPage = location.pathname.startsWith("/rpc-debug");
    const isOracleKeeperDebugPage = location.pathname.startsWith("/oracle-keeper-debug");
    const wasTradePage = prevPathname?.startsWith("/trade") && !isTradePage;
    const wasRpcDebugPage = prevPathname?.startsWith("/rpc-debug") && !isRpcDebugPage;
    const wasOracleKeeperDebugPage = prevPathname?.startsWith("/oracle-keeper-debug") && !isOracleKeeperDebugPage;

    const shouldShow = isTradePage || isRpcDebugPage || isOracleKeeperDebugPage;

    if (isTradePage || isRpcDebugPage || isOracleKeeperDebugPage) {
      freshnessMetrics.setEnabled(true);
    } else {
      freshnessMetrics.setEnabled(false);
      if ((wasTradePage || wasRpcDebugPage || wasOracleKeeperDebugPage) && !shouldShow) {
        freshnessMetrics.clearAll();
      }
    }
  }, [location.pathname, prevPathname]);

  useEffect(() => {
    if (prevChainId && prevChainId !== chainId) {
      Object.values(FreshnessMetricId).forEach((metricId) => {
        freshnessMetrics.clear(prevChainId, metricId);
      });
    }
  }, [chainId, prevChainId]);
}
