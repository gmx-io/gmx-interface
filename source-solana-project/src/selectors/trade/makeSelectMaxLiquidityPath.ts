import { createAppStoreSelectorFactory } from '@/zustand/useAppStore';

import { BN_ZERO } from '@/config/constants';
import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { getSwapPathOfMaxLiquidity } from '@/utils/tradebox/getSwapPathOfMaxLiquidity';
import { makeSelectAllPaths } from './makeSelectAllPaths';
import { makeSelectWrappedFromAddress } from './makeSelectWrappedFromAddress';

export const makeSelectMaxLiquidityPath = createAppStoreSelectorFactory<
  { maxLiquidity: BN; maxLiquidityPath: string[] | undefined },
  [string | undefined, string | undefined]
>((fromTokenAddress, toTokenAddress) =>
  createAppStoreSelector(
    [
      selectMarketsInfo,
      makeSelectAllPaths(fromTokenAddress, toTokenAddress),
      makeSelectWrappedFromAddress(fromTokenAddress),
    ],
    (marketsInfo, allPaths, wrappedFromAddress) => {
      let maxLiquidity = BN_ZERO;
      let maxLiquidityPath: string[] | undefined = undefined;

      if (!allPaths || !marketsInfo || !wrappedFromAddress) {
        return { maxLiquidity, maxLiquidityPath };
      }

      for (const route of allPaths) {
        const liquidity = getSwapPathOfMaxLiquidity({
          marketsInfo,
          swapPath: route.path,
          initialCollateralAddress: wrappedFromAddress,
        });

        if (liquidity.gt(maxLiquidity)) {
          maxLiquidity = liquidity;
          maxLiquidityPath = route.path;
        }
      }

      return { maxLiquidity, maxLiquidityPath };
    }
  )
);
