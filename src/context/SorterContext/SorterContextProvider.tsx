import noop from "lodash/noop";
import { PropsWithChildren, createContext, useCallback, useContext, useMemo, useState } from "react";

import { SORTER_CONFIG_KEY } from "config/localStorage";
import { updateByKey } from "sdk/utils/objects";
import { SorterConfig, SorterKey } from "./types";

localStorage.removeItem(SORTER_CONFIG_KEY);

type SorterState = Record<SorterKey, SorterConfig>;

const DEFAULT_SORTER_STATE: SorterState = {
  "chart-token-selector": { orderBy: "unspecified", direction: "unspecified", isDefault: true },
  "gm-list": { orderBy: "unspecified", direction: "unspecified", isDefault: true },
  "dashboard-markets-list": { orderBy: "unspecified", direction: "unspecified", isDefault: true },
  "gm-token-selector": { orderBy: "unspecified", direction: "unspecified", isDefault: true },
  "leaderboard-accounts-table": { orderBy: "unspecified", direction: "unspecified", isDefault: true },
  "leaderboard-positions-table": { orderBy: "unspecified", direction: "unspecified", isDefault: true },
};

type SorterContextType = {
  state: SorterState;
  setConfig: (key: SorterKey, config: React.SetStateAction<SorterConfig<any>>) => void;
};

const context = createContext<SorterContextType>({
  state: DEFAULT_SORTER_STATE,
  setConfig: noop,
});

const Provider = context.Provider;

export function SorterContextProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<SorterState>(DEFAULT_SORTER_STATE);

  const setConfig = useCallback(
    (key: SorterKey, config: React.SetStateAction<SorterConfig<any>>) => {
      setState(
        (prev) => updateByKey(prev, key, typeof config === "function" ? config(prev[key]) : config) as SorterState
      );
    },
    [setState]
  );

  const stableValue = useMemo(() => ({ state, setConfig }), [state, setConfig]);

  return <Provider value={stableValue}>{children}</Provider>;
}

export function useSorterConfig<SortField extends string | "unspecified">(
  key: SorterKey,
  initialConfig?: SorterConfig<SortField>
): [SorterConfig<SortField>, (config: React.SetStateAction<SorterConfig<SortField>>) => void] {
  const { state, setConfig } = useContext(context);

  const stateSorterConfig = state[key] as SorterConfig<SortField>;

  const [sorterConfig, setSorterConfig] = useState<SorterConfig<SortField>>(
    stateSorterConfig.isDefault ? initialConfig ?? stateSorterConfig : stateSorterConfig
  );

  const bindedSetConfig = useCallback(
    (config: React.SetStateAction<SorterConfig<SortField>>) => {
      setSorterConfig(config);
      setConfig(key, config);
    },
    [setConfig, key]
  );

  return [sorterConfig, bindedSetConfig];
}
