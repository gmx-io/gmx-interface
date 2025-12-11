import { useCallback } from "react";
import { useHistory, useLocation } from "react-router-dom";

import useRouteQuery from "./useRouteQuery";

export function useReactRouterSearchParam(param: string): [string | undefined, (value: string | undefined) => void] {
  const history = useHistory();
  const location = useLocation();

  const searchParams = useRouteQuery();
  const value = searchParams.get(param) ?? undefined;

  const setValue = useCallback(
    (newValue: string | undefined) => {
      const newSearchParams = new URLSearchParams(location.search);
      if (newValue) {
        newSearchParams.set(param, newValue);
      } else {
        newSearchParams.delete(param);
      }
      history.replace({
        ...location,
        search: newSearchParams.toString(),
      });
    },
    [history, location, param]
  );

  return [value, setValue] as const;
}
