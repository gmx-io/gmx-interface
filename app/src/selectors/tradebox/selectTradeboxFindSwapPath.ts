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
import { selectTradeboxFromTokenAddress } from './selectTradeboxFromTokenAddress';
import { selectTradeboxToTokenAddress } from './selectTradeboxToTokenAddress';
import { selectTradeboxTradeFlags } from './selectTradeboxTradeFlags';

export const selectTradeboxFindSwapPath = createAppStoreSelector(
  [
    selectTradeboxFromTokenAddress,
    selectTradeboxToTokenAddress,
    selectTradeboxCollateralTokenAddress,
    selectTradeboxTradeFlags,
    selectMarketsInfo,
    selectSwapGraph,
    selectSwapEstimator,
  ],
  (
    fromTokenAddressRaw,
    toTokenAddress,
    collateralTokenAddress,
    tradeFlags,
    marketsInfo,
    marketsGraph,
    swapEstimator
  ) => {
    return (usdIn: BN, opts: { byLiquidity?: boolean }) => {
      const fromTokenAddress = isNativeToken(fromTokenAddressRaw)
        ? WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58()
        : fromTokenAddressRaw;
      const targetTokenAddressRaw = tradeFlags.isPosition
        ? collateralTokenAddress
        : toTokenAddress;
      const targetTokenAddress = isNativeToken(targetTokenAddressRaw)
        ? WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58()
        : targetTokenAddressRaw;

      if (
        !fromTokenAddress ||
        !targetTokenAddress ||
        !marketsInfo ||
        !marketsGraph ||
        !swapEstimator
      ) {
        return undefined;
      }

      const allPaths = findAllPaths(
        marketsInfo,
        marketsGraph,
        fromTokenAddress,
        targetTokenAddress
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
        shouldUnwrapNativeToken:
          isNativeToken(fromTokenAddressRaw) ||
          isNativeToken(targetTokenAddressRaw),
        shouldApplyPriceImpact: true,
        usdIn,
      });
    };
  }
);
