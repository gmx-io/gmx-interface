import { useEffect } from "react";
import { OpenAppEvent, metrics } from ".";
import { isPageRefreshsed } from "lib/isPageRefreshed";

let isOpenAppSent = false;

export function useOpenAppMetric() {
  useEffect(() => {
    if (isOpenAppSent) {
      return;
    }

    metrics.pushEvent<OpenAppEvent>({
      event: "openApp",
      isError: false,
      data: {
        isRefreshed: isPageRefreshsed,
      },
    });

    isOpenAppSent = true;
  }, []);
}
