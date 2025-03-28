import { useEffect } from "react";

import { isPageRefreshed } from "lib/isPageRefreshed";

import { OpenAppEvent, metrics } from ".";

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
        isRefreshed: isPageRefreshed,
      },
    });

    isOpenAppSent = true;
  }, []);
}
