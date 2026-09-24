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
import { selectOrderEditorEditingOrder } from './selectOrderEditorEditingOrder';
import { selectOrderEditorToToken } from './selectOrderEditorToToken';

export const selectOrderEditorFindSwapPath = createAppStoreSelector(
  [
    selectOrderEditorEditingOrder,
    selectOrderEditorToToken,
    selectMarketsInfo,
    selectSwapGraph,
    selectSwapEstimator,
  ],
  (order, toToken, marketsInfo, marketsGraph, swapEstimator) => {
    if (!order)
      throw new Error('selectOrderEditorSwapRoutes: Order is not defined');
    if (!toToken) return undefined;

    const fromTokenAddress = order.initialCollateralTokenAddress.toBase58();
    const toTokenAddress = toToken.address.toBase58();

    return (usdIn: BN, opts: { byLiquidity?: boolean }) => {
      if (!marketsInfo || !marketsGraph || !swapEstimator) {
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
        shouldUnwrapNativeToken: isNativeToken(toTokenAddress),
        shouldApplyPriceImpact: true,
        usdIn,
      });
    };
  }
);
