// eslint-disable-next-line no-restricted-imports
import { type DebouncedFuncLeading } from "lodash";
import debounce from "lodash/debounce";
import identity from "lodash/identity";
import { useMemo } from "react";

export function useLeadingDebounce<T>(value: T): T {
  const leadingDebounce: DebouncedFuncLeading<(value: T) => T> = useMemo(() => {
    return debounce(identity, 100, {
      leading: true,
      trailing: true,
      maxWait: 1000,
    });
  }, []);

  return leadingDebounce(value);
}
