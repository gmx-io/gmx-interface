import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocalStorage } from "react-use";

import { EMPTY_OBJECT } from "lib/objects";
import { usePrevious } from "lib/usePrevious";

export function useLocalStorageByChainId<T>(
  chainId: number,
  key: string,
  defaultValue: T
): [T | undefined, React.Dispatch<React.SetStateAction<T>>] {
  const [internalValue, setInternalValue] = useLocalStorage<Record<number, T>>(key, {});
  const internalValueRef = useRef(internalValue);

  const setValue: React.Dispatch<React.SetStateAction<T>> = useCallback(
    (value) => {
      const internalValue = internalValueRef.current;
      const resolvedValue: T =
        typeof value === "function" ? (value as (prev: T) => T)(internalValue?.[chainId] || defaultValue) : value;

      const newInternalValue = {
        ...internalValue,
        [chainId]: resolvedValue,
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

export function hasStoredLocalStorageValue(key: LocalStorageKey | LocalStorageKey[]) {
  try {
    return window.localStorage.getItem(JSON.stringify(key)) !== null;
  } catch (e) {
    return false;
  }
}

export function readLocalStorageItem<T>(
  key: LocalStorageKey | LocalStorageKey[],
  opts: {
    deserializer: (value: string) => T | undefined;
  }
): T | undefined {
  if (getShouldSkipKey(key)) {
    return undefined;
  }

  try {
    const stored = window.localStorage.getItem(JSON.stringify(key));

    if (stored === null) {
      return undefined;
    }

    return opts.deserializer(stored);
  } catch (e) {
    return undefined;
  }
}

export function writeLocalStorageItem<T>(
  key: LocalStorageKey | LocalStorageKey[],
  value: T,
  opts: {
    serializer: (value: T) => string;
  }
): void {
  if (getShouldSkipKey(key)) {
    return;
  }

  try {
    window.localStorage.setItem(JSON.stringify(key), opts.serializer(value));
  } catch (e) {
    // If user is in private mode or has storage restriction localStorage can throw
  }
}

export function removeLocalStorageItem(key: LocalStorageKey | LocalStorageKey[]): void {
  if (getShouldSkipKey(key)) {
    return;
  }

  try {
    window.localStorage.removeItem(JSON.stringify(key));
  } catch (e) {
    // If user is in private mode or has storage restriction localStorage can throw
  }
}

export function tryGetLocalStorageItem<T>(key: string): T | undefined {
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
  const initialValueRef = useRef(initialValue);
  const [valueMap, setValueMap] = useState<Record<string, T>>(() => {
    if (shouldSkipKey) {
      return EMPTY_OBJECT;
    }
    const item = tryGetLocalStorageItem<T>(serializedKey) ?? initialValue;
    return { [serializedKey]: item };
  });

  const prevShouldSkip = usePrevious(shouldSkipKey);
  useEffect(() => {
    if (shouldSkipKey) {
      return;
    }

    setValueMap((prev) => {
      if (serializedKey in prev && !prevShouldSkip) {
        return prev;
      }

      const item = tryGetLocalStorageItem<T>(serializedKey) ?? initialValueRef.current;
      return { ...prev, [serializedKey]: item };
    });
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

  const value = shouldSkipKey
    ? undefined
    : serializedKey in valueMap
      ? valueMap[serializedKey]
      : tryGetLocalStorageItem<T>(serializedKey) ?? initialValueRef.current;

  return [value, setValue] as const;
}
