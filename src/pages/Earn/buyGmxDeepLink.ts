import { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";

import useRouteQuery from "lib/useRouteQuery";

const BUY_GMX_QUERY_PARAM = "buyGmx";

export const BUY_GMX_DEEP_LINK = `/earn/portfolio?${BUY_GMX_QUERY_PARAM}=1`;

export function useBuyGmxDeepLink() {
  const history = useHistory();
  const isRequested = useRouteQuery().has(BUY_GMX_QUERY_PARAM);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isRequested) {
      return;
    }

    setIsVisible(true);

    const params = new URLSearchParams(history.location.search);
    params.delete(BUY_GMX_QUERY_PARAM);
    history.replace({ search: params.toString() });
  }, [isRequested, history]);

  return [isVisible, setIsVisible] as const;
}
