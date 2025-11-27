import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { usePrevious } from "lib/usePrevious";

import { freshnessMetrics } from "./reportFreshnessMetric";

export function useFreshnessMetricsControl() {
  const location = useLocation();
  const prevPathname = usePrevious(location.pathname);

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
}
