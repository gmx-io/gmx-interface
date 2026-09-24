import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

export default function useSearchParams<T extends Record<string, string>>() {
  const { search } = useLocation();

  return useMemo(() => {
    const queryParams = new URLSearchParams(search);
    const parsedQueryParams = {} as { [K in keyof T]: string };

    queryParams.forEach((value, key: string) => {
      parsedQueryParams[key as keyof T] = value;
    });

    return parsedQueryParams as T;
  }, [search]);
}
