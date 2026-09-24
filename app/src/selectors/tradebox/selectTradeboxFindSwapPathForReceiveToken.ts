import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { isNativeToken } from '@/utils/token/isNativeToken';
import { findAllPaths } from '@/utils/tradebox/findAllPaths';
import { getSwapBestPath } from '@/utils/tradebox/getSwapBestPath';
import { getSwapPathStats } from '@/utils/tradebox/getSwapPathStats';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';

import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectSwapEstimator } from '../trade/selectSwapEstimator';
import { selectSwapGraph } from '../trade/selectSwapGraph';
import { selectTradeboxCollateralTokenAddress } from './selectTradeboxCollateralTokenAddress';
import { selectTradeboxReceiveTokenAddress } from './selectTradeboxReceiveTokenAddress';

export const selectTradeboxFindSwapPathForReceiveToken = createAppStoreSelector(
  [
    selectTradeboxReceiveTokenAddress,
    selectTradeboxCollateralTokenAddress,

    selectMarketsInfo,
    selectSwapGraph,
    selectSwapEstimator,
  ],
  (
    toTokenAddressRaw,
    collateralTokenAddress,

    marketsInfo,
    marketsGraph,
    swapEstimator
  ) => {
    let fromTokenAddress = collateralTokenAddress;
    let toTokenAddress = toTokenAddressRaw;

    if (isNativeToken(fromTokenAddress)) {
      fromTokenAddress = WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58();
    }

    if (isNativeToken(toTokenAddressRaw)) {
      toTokenAddress = WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58();
    }

    return (usdIn: BN, opts: { byLiquidity?: boolean }) => {
      if (
        !marketsInfo ||
        !marketsGraph ||
        !swapEstimator ||
        !fromTokenAddress ||
        !toTokenAddress
      ) {
        return undefined;
      }

      const allPaths = findAllPaths(
        marketsInfo,
        marketsGraph,
        fromTokenAddress,
        toTokenAddress
      );

      if (!allPaths?.length) {
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
        shouldUnwrapNativeToken: isNativeToken(toTokenAddressRaw),
        shouldApplyPriceImpact: true,
        usdIn,
      });
    };
  }
);
