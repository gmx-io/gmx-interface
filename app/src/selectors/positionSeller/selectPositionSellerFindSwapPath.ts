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
import { selectPositionSellerClosingPosition } from './selectPositionSellerClosingPosition';
import { selectPositionSellerReceiveToken } from './selectPositionSellerReceiveToken';

export const selectPositionSellerFindSwapPath = createAppStoreSelector(
  [
    selectPositionSellerClosingPosition,
    selectPositionSellerReceiveToken,
    selectMarketsInfo,
    selectSwapGraph,
    selectSwapEstimator,
  ],
  (position, receiveToken, marketsInfo, marketsGraph, swapEstimator) => {
    const toTokenAddressRaw = receiveToken?.address?.toBase58();

    let fromTokenAddress = position?.collateralTokenAddress?.toBase58();
    let toTokenAddress = toTokenAddressRaw;

    if (isNativeToken(fromTokenAddress)) {
      fromTokenAddress = WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58();
    }

    if (isNativeToken(toTokenAddress)) {
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
