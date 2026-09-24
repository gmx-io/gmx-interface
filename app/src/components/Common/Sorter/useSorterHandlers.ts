import { useCallback, useRef, useState } from 'react';

type SortDirection = 'asc' | 'desc' | 'unspecified';

export function useSorterHandlers<SortField extends string>(
  initialOrderBy?: SortField,
  initialDirection?: SortDirection
) {
  const [orderBy, setOrderBy] = useState<SortField | 'unspecified'>(
    initialOrderBy ?? 'unspecified'
  );
  const [direction, setDirection] = useState<SortDirection>(
    initialDirection ?? 'unspecified'
  );
  const onChangeCache = useRef<
    Partial<Record<SortField, (direction: SortDirection) => void>>
  >({});

  const getSorterProps = useCallback(
    (field: SortField) => {
      let cachedHandler = onChangeCache.current[field];

      if (!cachedHandler) {
        cachedHandler = (newDirection: SortDirection) => {
          setOrderBy(field);
          setDirection(newDirection);
        };
        onChangeCache.current[field] = cachedHandler;
      }

      return {
        direction: orderBy === field ? direction : 'unspecified',
        onChange: cachedHandler!,
      };
    },
    [direction, orderBy]
  );

  return { getSorterProps, orderBy, direction, setOrderBy, setDirection };
}
