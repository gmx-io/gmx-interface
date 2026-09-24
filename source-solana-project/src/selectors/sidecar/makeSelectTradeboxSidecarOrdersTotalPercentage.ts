import { selectLimitEntries } from './baseSelectors';

import { selectTpEntries } from './baseSelectors';

import { BN_ZERO } from '@/config/constants';
import { BN } from '@coral-xyz/anchor';
import { selectSlEntries } from './baseSelectors';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { createAppStoreSelectorFactory } from '@/zustand/useAppStore';

export const makeSelectTradeboxSidecarOrdersTotalPercentage =
  createAppStoreSelectorFactory<BN, ['tp' | 'sl' | 'limit']>((group) =>
    createAppStoreSelector(
      [selectSlEntries, selectTpEntries, selectLimitEntries],
      (slEntries, tpEntries, limitEntries) => {
        const entries = {
          sl: slEntries,
          tp: tpEntries,
          limit: limitEntries,
        }[group];

        return entries
          .filter((entry) => entry.txnType !== 'cancel')
          .reduce<BN>(
            (total, entry) =>
              entry.percentage?.value
                ? total.add(entry.percentage.value)
                : total,
            BN_ZERO
          );
      }
    )
  );
