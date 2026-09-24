import { createAppStoreSelector } from '@/zustand/useAppStore';

import { createAppStoreSelectorFactory } from '@/zustand/useAppStore';
import { SidecarOrderEntry } from './types';
import { selectSlEntries } from './baseSelectors';
import { selectTpEntries } from './baseSelectors';
import { selectLimitEntries } from './baseSelectors';
import { selectSetSlEntries } from './baseSelectors';
import { selectSetTpEntries } from './baseSelectors';
import { selectSetLimitEntries } from './baseSelectors';

export const makeSelectTradeboxSidecarOrdersState =
  createAppStoreSelectorFactory<
    readonly [SidecarOrderEntry[], (entries: SidecarOrderEntry[]) => void],
    ['tp' | 'sl' | 'limit']
  >((group) =>
    createAppStoreSelector(
      [
        selectSlEntries,
        selectTpEntries,
        selectLimitEntries,
        selectSetSlEntries,
        selectSetTpEntries,
        selectSetLimitEntries,
      ],
      (
        slEntries,
        tpEntries,
        limitEntries,
        setSlEntries,
        setTpEntries,
        setLimitEntries
      ) => {
        switch (group) {
          case 'sl':
            return [slEntries, setSlEntries] as const;
          case 'tp':
            return [tpEntries, setTpEntries] as const;
          case 'limit':
            return [limitEntries, setLimitEntries] as const;
          default:
            return [[], () => {}] as const;
        }
      }
    )
  );
