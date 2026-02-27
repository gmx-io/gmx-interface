import { useMemo } from "react";
import { useLocation } from "react-router-dom";

export default function useSearchParams<T extends Record<string, string>>() {
  const { search } = useLocation();

  return useMemo(() => {
    const queryParams = new URLSearchParams(search);

    const parsedQueryParams: Record<string, string> = {};

    queryParams.forEach((value, key) => {
      parsedQueryParams[key] = value;
    });

    return parsedQueryParams as T;
  }, [search]);
}
