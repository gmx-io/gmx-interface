import { useCallback } from "react";
import { useLocalStorage } from "react-use";

export function useLocalStorageByChainId<T>(
  chainId: number,
  key: string,
  defaultValue: T
): [T | undefined, (value: T) => void] {
  const [internalValue, setInternalValue] = useLocalStorage(key, {});

  const setValue = useCallback(
    (value) => {
      setInternalValue((internalValue) => {
        if (typeof value === "function") {
          value = value(internalValue?.[chainId] || defaultValue);
        }

        const newInternalValue = {
          ...internalValue,
          [chainId]: value,
        };
        return newInternalValue;
      });
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
