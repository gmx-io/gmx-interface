import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocalStorage } from "react-use";

import { EMPTY_OBJECT } from "lib/objects";
import { usePrevious } from "lib/usePrevious";

export function useLocalStorageByChainId<T>(
  chainId: number,
  key: string,
  defaultValue: T
): [T | undefined, React.Dispatch<React.SetStateAction<T>>] {
  const [internalValue, setInternalValue] = useLocalStorage(key, {});
  const internalValueRef = useRef(internalValue);

  const setValue: React.Dispatch<React.SetStateAction<T>> = useCallback(
    (value) => {
      const internalValue = internalValueRef.current;
      if (typeof value === "function") {
        // @ts-ignore
        value = value(internalValue?.[chainId] || defaultValue);
      }

      const newInternalValue = {
        ...internalValue,
        [chainId]: value,
      };

      internalValueRef.current = newInternalValue;

      setInternalValue(newInternalValue);
    },
    [chainId, setInternalValue, defaultValue]
  );

  let value;

  if (internalValue && chainId in internalValue) {
    value = internalValue[chainId];
  } else {
    value = defaultValue;
  }

  return [value, setValue];
}

export type LocalStorageKey = string | number | boolean | null | undefined;

export function useLocalStorageSerializeKey<T>(
  key: LocalStorageKey | LocalStorageKey[],
  initialValue: T,
  opts?: {
    raw: boolean;
    serializer: (val: T) => string;
    deserializer: (value: string) => T;
  }
) {
  key = JSON.stringify(key);

  return useLocalStorage<T>(key, initialValue, opts);
}

function tryGetLocalStorageItem<T>(key: string): T | undefined {
  const item = localStorage.getItem(key);
  if (!item) {
    return undefined;
  }
  try {
    return JSON.parse(item);
  } catch (error) {
    return undefined;
  }
}

function getShouldSkipKey(key: LocalStorageKey | LocalStorageKey[]): boolean {
  return key === null || key === undefined || (Array.isArray(key) && key.some((k) => k === null || k === undefined));
}

/**
 * Respects reactive prev value in consecutive calls to setValue
 */
export function useLocalStorageSerializeKeySafe<
  T extends string | number | boolean | null | undefined | Record<string, any>,
>(
  key: LocalStorageKey | LocalStorageKey[],
  initialValue: T
): [T | undefined, (value: React.SetStateAction<T | undefined>) => void] {
  const serializedKey = JSON.stringify(key);
  const shouldSkipKey = getShouldSkipKey(key);
  const [valueMap, setValueMap] = useState<Record<string, T>>(() => {
    if (shouldSkipKey) {
      return EMPTY_OBJECT;
    }
    const item = tryGetLocalStorageItem<T>(serializedKey) ?? initialValue;
    return { [serializedKey]: item };
  });

  const prevShouldSkip = usePrevious(shouldSkipKey);
  useEffect(() => {
    if (prevShouldSkip && !shouldSkipKey) {
      const item = tryGetLocalStorageItem<T>(serializedKey);
      if (item) {
        setValueMap((prev) => {
          const newMap = { ...prev, [serializedKey]: item };
          return newMap;
        });
      }
    }
  }, [prevShouldSkip, serializedKey, shouldSkipKey]);

  const setValue = useCallback(
    (value: React.SetStateAction<T | undefined>) => {
      if (shouldSkipKey) {
        return;
      }
      setValueMap((prev) => {
        const oldValue = prev[serializedKey] ?? tryGetLocalStorageItem<T>(serializedKey);
        const newValue = typeof value === "function" ? value(oldValue) : value;
        const newMap = { ...prev, [serializedKey]: newValue };
        localStorage.setItem(serializedKey, JSON.stringify(newValue));
        return newMap;
      });
    },
    [serializedKey, shouldSkipKey]
  );

  const value = shouldSkipKey ? undefined : valueMap[serializedKey];

  return [value, setValue] as const;
}
