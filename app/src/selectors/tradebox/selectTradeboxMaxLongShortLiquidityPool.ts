import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectIndexTokensStat } from '../stats/selectIndexTokensStat';
import { selectTradeboxIndexTokenAddress } from './selectTradeboxIndexTokenAddress';

export const selectTradeboxMaxLongShortLiquidityPool = createAppStoreSelector(
  selectIndexTokensStat,
  selectTradeboxIndexTokenAddress,
  (indexTokensStat, indexTokenAddress) => {
    if (!indexTokenAddress) return undefined;
    const maxLongShortLiquidityPoolData = indexTokensStat[indexTokenAddress];
    const { maxLongLiquidityPool, maxShortLiquidityPool } =
      maxLongShortLiquidityPoolData;
    return { maxLongLiquidityPool, maxShortLiquidityPool };
  }
);
