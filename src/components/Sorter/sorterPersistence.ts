import { Dispatch, SetStateAction, useCallback, useState, useSyncExternalStore } from "react";
import type { SortDirection, SorterPersistedKey } from "./types";

type SorterPersistedConfig<SortField extends string | "unspecified" = "unspecified"> = {
  orderBy: SortField;
  direction: SortDirection;
};

const DEFAULT_SORTER_CONFIG: SorterPersistedConfig = { orderBy: "unspecified", direction: "unspecified" };

const sorterConfigKeys: SorterPersistedKey[] = Object.keys({
  "chart-token-selector": 1,
  "gm-list": 1,
  "dashboard-markets-list": 1,
  "gm-token-selector": 1,
} satisfies Record<SorterPersistedKey, 1>) as SorterPersistedKey[];

const createLocalStorageStore = (
  key: SorterPersistedKey,
  defaultValue: SorterPersistedConfig = DEFAULT_SORTER_CONFIG
) => {
  const suffixedKey = `${key}-sorter-config`;

  let listeners = new Set<() => void>();

  let lastReturnedString = "";
  let lastReturnedConfig: SorterPersistedConfig | undefined;

  const getSnapshot = (): SorterPersistedConfig => {
    const storedValue = localStorage.getItem(suffixedKey) ?? "";

    if (storedValue !== lastReturnedString) {
      lastReturnedConfig = storedValue ? JSON.parse(storedValue) : defaultValue;
      lastReturnedString = storedValue;
    }

    return lastReturnedConfig ?? defaultValue;
  };

  const setSnapshot = (value: SorterPersistedConfig) => {
    localStorage.setItem(suffixedKey, JSON.stringify(value));
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return {
    getSnapshot,
    setSnapshot,
    subscribe,
  };
};

const sorterConfigStores = Object.fromEntries(
  sorterConfigKeys.map((key) => {
    return [key, createLocalStorageStore(key)];
  })
) as Record<SorterPersistedKey, ReturnType<typeof createLocalStorageStore>>;

/* eslint-disable react-hooks/rules-of-hooks */
export const useSorterConfig = <SortField extends string | "unspecified">(
  key: SorterPersistedKey | "in-memory",
  initialConfig?: SorterPersistedConfig<SortField>
): [SorterPersistedConfig<SortField>, Dispatch<SetStateAction<SorterPersistedConfig<SortField>>>] => {
  if (key === "in-memory") {
    return useState<SorterPersistedConfig<SortField>>(
      initialConfig ?? (DEFAULT_SORTER_CONFIG as SorterPersistedConfig<SortField>)
    );
  }

  const config = useSyncExternalStore<SorterPersistedConfig>(
    sorterConfigStores[key].subscribe,
    sorterConfigStores[key].getSnapshot
  );
  const setConfig = useCallback(
    (value: SetStateAction<SorterPersistedConfig>) => {
      const latestConfig = sorterConfigStores[key].getSnapshot();
      const newConfig = typeof value === "function" ? value(latestConfig) : value;
      sorterConfigStores[key].setSnapshot(newConfig);
    },
    [key]
  );

  return [config, setConfig] as unknown as [
    SorterPersistedConfig<SortField>,
    Dispatch<SetStateAction<SorterPersistedConfig<SortField>>>,
  ];
};
/* eslint-enable react-hooks/rules-of-hooks */
