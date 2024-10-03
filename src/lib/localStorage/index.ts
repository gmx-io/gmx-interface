import React, { useCallback, useRef } from "react";
import { useLocalStorage } from "react-use";
import { SHOW_DEBUG_VALUES_KEY } from "config/localStorage";

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

export function isDebugMode() {
  return localStorage.getItem(JSON.stringify(SHOW_DEBUG_VALUES_KEY)) === "true";
}
