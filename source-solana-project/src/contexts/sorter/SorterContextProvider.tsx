/* eslint-disable @typescript-eslint/no-explicit-any */
import noop from 'lodash/noop';
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useMemo,
  useState,
} from 'react';

import { updateByKey } from '@/utils/lib/object';
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
    config: React.SetStateAction<SorterConfig<any>>
  ) => void;
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
        (prev) =>
          updateByKey(
            prev,
            key,
            typeof config === 'function' ? config(prev[key]) : config
          ) as SorterState
      );
    },
    [setState]
  );

  const stableValue = useMemo(() => ({ state, setConfig }), [state, setConfig]);

  return <Provider value={stableValue}>{children}</Provider>;
}
