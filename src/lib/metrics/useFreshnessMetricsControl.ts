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
    const wasTradePage = prevPathname?.startsWith("/trade") && !isTradePage;

    if (isTradePage) {
      freshnessMetrics.setEnabled(true);
    } else {
      freshnessMetrics.setEnabled(false);
      // Clear cache when leaving trade page
      if (wasTradePage) {
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
