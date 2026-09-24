import { BN_ZERO } from '@/config/constants';
import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { isNativeToken } from '@/utils/token/isNativeToken';
import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';
import { isWrappedNativeToken } from '@/utils/token/isWrappedNativeToken';
import { findAllPaths } from '@/utils/tradebox/findAllPaths';
import { getSwapPathOfMaxLiquidity } from '@/utils/tradebox/getSwapPathOfMaxLiquidity';
import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectSwapGraph } from '../trade/selectSwapGraph';
import { selectTradeboxCollateralTokenAddress } from './selectTradeboxCollateralTokenAddress';
import { selectTradeboxFromTokenAddress } from './selectTradeboxFromTokenAddress';
import { selectTradeboxToTokenAddress } from './selectTradeboxToTokenAddress';
import { selectTradeboxTradeFlags } from './selectTradeboxTradeFlags';

export const selectTradeboxMaxLiquidityPath = createAppStoreSelector(
  [
    selectTradeboxFromTokenAddress,
    selectTradeboxToTokenAddress,
    selectTradeboxCollateralTokenAddress,
    selectTradeboxTradeFlags,
    selectMarketsInfo,
    selectSwapGraph,
  ],
  (
    fromTokenAddressRaw,
    toTokenAddressRaw,
    collateralTokenAddress,
    tradeFlags,
    marketsInfo,
    marketsGraph
  ) => {
    const targetTokenAddressRaw = tradeFlags.isPosition
      ? collateralTokenAddress
      : toTokenAddressRaw;
    const fromTokenAddress = isNativeToken(fromTokenAddressRaw)
      ? WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58()
      : fromTokenAddressRaw;
    const targetTokenAddress = isNativeToken(targetTokenAddressRaw)
      ? WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58()
      : targetTokenAddressRaw;

    if (
      !fromTokenAddress ||
      !targetTokenAddress ||
      !marketsInfo ||
      !marketsGraph
    ) {
      return { maxLiquidity: BN_ZERO, maxLiquidityPath: undefined };
    }

    const isWrap =
      isNativeToken(fromTokenAddressRaw) &&
      isWrappedNativeToken(targetTokenAddressRaw);
    const isUnwrap =
      isWrappedNativeToken(fromTokenAddressRaw) &&
      isNativeToken(targetTokenAddressRaw);
    const isSameToken = isSameTokenAddress(
      fromTokenAddress,
      targetTokenAddress
    );

    if (isWrap || isUnwrap || isSameToken) {
      return { maxLiquidity: BN_ZERO, maxLiquidityPath: undefined };
    }

    const allPaths = findAllPaths(
      marketsInfo,
      marketsGraph,
      fromTokenAddress,
      targetTokenAddress
    );

    if (!allPaths || allPaths.length === 0) {
      return { maxLiquidity: BN_ZERO, maxLiquidityPath: undefined };
    }

    let maxLiquidity = BN_ZERO;
    let maxLiquidityPath: string[] | undefined = undefined;

    for (const route of allPaths) {
      const liquidity = getSwapPathOfMaxLiquidity({
        marketsInfo: marketsInfo,
        swapPath: route.path,
        initialCollateralAddress: fromTokenAddress,
      });
      if (liquidity.gt(maxLiquidity)) {
        maxLiquidity = liquidity;
        maxLiquidityPath = route.path;
      }
    }

    return { maxLiquidity, maxLiquidityPath };
  }
);
