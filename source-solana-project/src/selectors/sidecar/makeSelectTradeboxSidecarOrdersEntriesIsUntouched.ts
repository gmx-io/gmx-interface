import {
  createAppStoreSelector,
  createAppStoreSelectorFactory,
} from '@/zustand/useAppStore';
import { selectSlEntriesIsUntouched } from './baseSelectors';

import { selectTpEntriesIsUntouched } from './baseSelectors';

import { selectLimitEntriesIsUntouched } from './baseSelectors';

export const makeSelectTradeboxSidecarOrdersEntriesIsUntouched =
  createAppStoreSelectorFactory<boolean, ['tp' | 'sl' | 'limit']>((group) =>
    createAppStoreSelector(
      [
        selectSlEntriesIsUntouched,
        selectTpEntriesIsUntouched,
        selectLimitEntriesIsUntouched,
      ],
      (slIsUntouched, tpIsUntouched, limitIsUntouched) => {
        switch (group) {
          case 'sl':
            return slIsUntouched;
          case 'tp':
            return tpIsUntouched;
          case 'limit':
            return limitIsUntouched;
          default:
            return false;
        }
      }
    )
  );
