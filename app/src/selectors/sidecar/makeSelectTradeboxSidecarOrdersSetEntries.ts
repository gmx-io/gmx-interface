import { createAppStoreSelectorFactory } from '@/zustand/useAppStore';

import { selectSetLimitEntries } from './baseSelectors';

import { selectSetTpEntries } from './baseSelectors';

import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectSetSlEntries } from './baseSelectors';
import { SidecarOrderEntry } from './types';

export const makeSelectTradeboxSidecarOrdersSetEntries =
  createAppStoreSelectorFactory<
    (entries: SidecarOrderEntry[]) => void,
    ['tp' | 'sl' | 'limit']
  >((group) =>
    createAppStoreSelector(
      [selectSetSlEntries, selectSetTpEntries, selectSetLimitEntries],
      (setSlEntries, setTpEntries, setLimitEntries) => {
        switch (group) {
          case 'sl':
            return setSlEntries;
          case 'tp':
            return setTpEntries;
          case 'limit':
            return setLimitEntries;
          default:
            return () => {};
        }
      }
    )
  );
