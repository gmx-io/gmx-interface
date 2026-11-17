import { useCallback } from "react";
import { useHistory } from "react-router-dom";

import useRouteQuery from "lib/useRouteQuery";

const BUY_GMX_QUERY_PARAM = "buyGmx";

export function getBuyGmxDeepLinkUrl(search = "") {
  const params = new URLSearchParams(search);
  params.set(BUY_GMX_QUERY_PARAM, "1");

  return `/earn/portfolio?${params}`;
}

export function useBuyGmxDeepLink() {
  const history = useHistory();
  const isVisible = useRouteQuery().has(BUY_GMX_QUERY_PARAM);

  const setIsVisible = useCallback(
    (nextIsVisible: boolean) => {
      const params = new URLSearchParams(history.location.search);

      if (nextIsVisible) {
        params.set(BUY_GMX_QUERY_PARAM, "1");
      } else {
        params.delete(BUY_GMX_QUERY_PARAM);
      }

      history.replace({ search: params.toString() });
    },
    [history]
  );

  return [isVisible, setIsVisible] as const;
}
