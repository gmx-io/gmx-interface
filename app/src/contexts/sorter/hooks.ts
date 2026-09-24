import noop from 'lodash/noop';
import { createContext, useCallback, useContext, useState } from 'react';

import { SorterConfig, SorterKey } from './types';

type SorterState = Record<SorterKey, SorterConfig>;

const DEFAULT_SORTER_STATE: SorterState = {
  'chart-token-selector': {
    orderBy: 'unspecified',
    direction: 'unspecified',
    isDefault: true,
  },
  'gm-list': {
    orderBy: 'unspecified',
    direction: 'unspecified',
    isDefault: true,
  },
  'dashboard-markets-list': {
    orderBy: 'unspecified',
    direction: 'unspecified',
    isDefault: true,
  },
  'gm-token-selector': {
    orderBy: 'unspecified',
    direction: 'unspecified',
    isDefault: true,
  },
  'leaderboard-accounts-table': {
    orderBy: 'unspecified',
    direction: 'unspecified',
    isDefault: true,
  },
  'leaderboard-positions-table': {
    orderBy: 'unspecified',
    direction: 'unspecified',
    isDefault: true,
  },
};

type SorterContextType = {
  state: SorterState;
  setConfig: (
    key: SorterKey,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: React.SetStateAction<SorterConfig<any>>
  ) => void;
};

const context = createContext<SorterContextType>({
  state: DEFAULT_SORTER_STATE,
  setConfig: noop,
});

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export function useSorterConfig<SortField extends string | 'unspecified'>(
  key: SorterKey,
  initialConfig?: SorterConfig<SortField>
): [
  SorterConfig<SortField>,
  (config: React.SetStateAction<SorterConfig<SortField>>) => void,
] {
  const { state, setConfig } = useContext(context);

  const stateSorterConfig = state[key] as SorterConfig<SortField>;

  const [sorterConfig, setSorterConfig] = useState<SorterConfig<SortField>>(
    stateSorterConfig.isDefault
      ? (initialConfig ?? stateSorterConfig)
      : stateSorterConfig
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
