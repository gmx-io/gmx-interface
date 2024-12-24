import { SORTER_CONFIG_KEY } from "config/localStorage";
import isEqual from "lodash/isEqual";
import { Dispatch, SetStateAction, useCallback, useState, useSyncExternalStore } from "react";

export type SortDirection = "asc" | "desc" | "unspecified";
export type SorterPersistedKey = "chart-token-selector" | "gm-list" | "dashboard-markets-list" | "gm-token-selector";

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

function tryParse<T>(value: string | null, defaultValue: T): T {
  if (!value) return defaultValue;

  try {
    return JSON.parse(value) as T;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Error parsing", e);
    return defaultValue;
  }
}

type LocalStorageStore<U> = {
  getSnapshot: () => U;
  setSnapshot: (value: U) => void;
  subscribe: (listener: () => void) => () => void;
};

const createLocalStorageStore = <T extends string, U>(
  configKey: string,
  valueKey: T,
  defaultValue: U
): LocalStorageStore<U> => {
  let listeners = new Set<() => void>();

  let lastReturnedValue: U | undefined;

  const getSnapshot = (): U => {
    const storedConfig = localStorage.getItem(configKey) ?? "";

    let storedValue: U = tryParse<Record<T, U>>(storedConfig, {} as Record<T, U>)[valueKey] ?? defaultValue;

    if (!lastReturnedValue || !isEqual(lastReturnedValue, storedValue)) {
      lastReturnedValue = storedValue;
    }

    return lastReturnedValue;
  };

  const setSnapshot = (value: U) => {
    localStorage.setItem(
      configKey,
      JSON.stringify({
        ...tryParse<Record<T, U>>(localStorage.getItem(configKey), {} as Record<T, U>),
        [valueKey]: value,
      })
    );
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
    return [key, createLocalStorageStore(SORTER_CONFIG_KEY, key, DEFAULT_SORTER_CONFIG)];
  })
) as Record<SorterPersistedKey, LocalStorageStore<SorterPersistedConfig>>;

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
