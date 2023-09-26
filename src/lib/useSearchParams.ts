import { useMemo } from "react";
import { useLocation } from "react-router-dom";

export default function useSearchParams<T>() {
  const { search } = useLocation();

  return useMemo(() => {
    const queryParams = new URLSearchParams(search);

    const parsedQueryParams: T = {} as T;

    queryParams.forEach((value, key) => {
      parsedQueryParams[key] = value;
    });

    return parsedQueryParams;
  }, [search]);
}
