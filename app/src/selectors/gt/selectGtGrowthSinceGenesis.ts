import { BN } from '@coral-xyz/anchor';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectGtGlobalDetailsGrowSteps } from './gtGlobalDetailsSelectors';
import { toBN } from 'gmsol';

export const selectGtGrowthSinceGenesis = createAppStoreSelector(
  [selectGtGlobalDetailsGrowSteps],
  (cycle): BN => {
    return toBN(Math.pow(1.021, cycle.toNumber()) * 10000 - 10000);
  }
);
