import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { FindSwapPath } from '@/selectors/trade/types';
import { isNativeToken } from '@/utils/token/isNativeToken';
import { getSwapBestPath } from '@/utils/tradebox/getSwapBestPath';
import { getSwapPathStats } from '@/utils/tradebox/getSwapPathStats';
import {
  createAppStoreSelector,
  createAppStoreSelectorFactory,
} from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';

import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectSwapEstimator } from '../trade/selectSwapEstimator';
import { makeSelectAllPaths } from './makeSelectAllPaths';

export const makeSelectFindSwapPath = createAppStoreSelectorFactory<
  FindSwapPath,
  [string | undefined, string | undefined]
>((fromTokenAddress, toTokenAddress) =>
  createAppStoreSelector(
    [
      selectMarketsInfo,
      makeSelectAllPaths(fromTokenAddress, toTokenAddress),
      selectSwapEstimator,
    ],
    (marketsInfo, allPaths, swapEstimator) => {
      return (usdIn: BN, opts: { byLiquidity?: boolean }) => {
        if (
          !allPaths?.length ||
          !swapEstimator ||
          !marketsInfo ||
          !fromTokenAddress
        ) {
          return undefined;
        }

        let swapPath: string[] | undefined = undefined;

        if (opts.byLiquidity) {
          swapPath = allPaths[0].path;
        } else {
          swapPath = getSwapBestPath(allPaths, usdIn, swapEstimator);
        }

        if (!swapPath) {
          return undefined;
        }

        return getSwapPathStats({
          marketsInfo,
          swapPath,
          initialCollateralAddress: fromTokenAddress,
          wrappedNativeTokenAddress: WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58(),
          shouldUnwrapNativeToken: isNativeToken(toTokenAddress),
          shouldApplyPriceImpact: true,
          usdIn,
        });
      };
    }
  )
);
