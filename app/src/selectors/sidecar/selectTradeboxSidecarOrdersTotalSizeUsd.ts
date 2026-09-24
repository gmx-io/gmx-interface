import { BN_ZERO } from '@/config/constants';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { selectLimitEntries } from './baseSelectors';
import { selectTradeboxIncreasePositionAmounts } from '../tradebox/selectTradeboxIncreasePositionAmounts';
import { selectTradeboxSelectedPosition } from '../tradebox/selectTradeboxSelectedPosition';

export const selectTradeboxSidecarOrdersTotalSizeUsd = createAppStoreSelector(
  [
    selectTradeboxSelectedPosition,
    selectTradeboxIncreasePositionAmounts,
    selectLimitEntries,
  ],
  (existingPosition, increaseAmounts, limitEntries): BN => {
    let result = BN_ZERO;

    if (existingPosition?.sizeInUsd) {
      result = result.add(existingPosition.sizeInUsd);
    }

    if (increaseAmounts?.sizeDeltaUsd) {
      result = result.add(increaseAmounts.sizeDeltaUsd);
    }

    limitEntries.forEach((entry) => {
      if (entry.txnType !== 'cancel' && entry.sizeUsd?.value) {
        result = result.add(entry.sizeUsd.value);
      }
    });

    return result;
  }
);
