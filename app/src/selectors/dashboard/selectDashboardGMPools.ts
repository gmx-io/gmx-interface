import { BN_ZERO } from '@/config/constants';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { selectIndexTokensStat } from '../stats/selectIndexTokensStat';

export const selectDashboardGMPoolsTVL = createAppStoreSelector(
  [selectIndexTokensStat],
  (indexTokensStats): BN => {
    return Object.entries(indexTokensStats).reduce(
      (totalGMPoolsTVL, [, indexStat]) => {
        return totalGMPoolsTVL.add(indexStat.totalPoolValue);
      },
      BN_ZERO
    );
  }
);
