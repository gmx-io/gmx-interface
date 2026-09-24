import { BN_ZERO } from '@/config/constants';
import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { isNativeToken } from '@/utils/token/isNativeToken';
import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';
import { findAllPaths } from '@/utils/tradebox/findAllPaths';
import { getSwapPathOfMaxLiquidity } from '@/utils/tradebox/getSwapPathOfMaxLiquidity';
import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectSwapGraph } from '../trade/selectSwapGraph';
import { selectPositionSellerClosingPosition } from './selectPositionSellerClosingPosition';
import { selectPositionSellerReceiveToken } from './selectPositionSellerReceiveToken';

export const selectPositionSellerMaxLiquidityPath = createAppStoreSelector(
  [
    selectPositionSellerClosingPosition,
    selectPositionSellerReceiveToken,
    selectMarketsInfo,
    selectSwapGraph,
  ],
  (position, receiveToken, marketsInfo, marketsGraph) => {
    const fromTokenAddressRaw = position?.collateralTokenAddress?.toBase58();
    const toTokenAddressRaw = receiveToken?.address?.toBase58();

    if (
      !fromTokenAddressRaw ||
      !toTokenAddressRaw ||
      !marketsInfo ||
      !marketsGraph
    ) {
      return { maxLiquidity: BN_ZERO, maxLiquidityPath: undefined };
    }

    const fromTokenAddress = isNativeToken(fromTokenAddressRaw)
      ? WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58()
      : fromTokenAddressRaw;

    const toTokenAddress = isNativeToken(toTokenAddressRaw)
      ? WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58()
      : toTokenAddressRaw;

    const isSameToken = isSameTokenAddress(fromTokenAddress, toTokenAddress);

    if (isSameToken) {
      return { maxLiquidity: BN_ZERO, maxLiquidityPath: undefined };
    }

    const allPaths = findAllPaths(
      marketsInfo,
      marketsGraph,
      fromTokenAddress,
      toTokenAddress
    );

    if (!allPaths || allPaths.length === 0) {
      return { maxLiquidity: BN_ZERO, maxLiquidityPath: undefined };
    }

    let maxLiquidity = BN_ZERO;
    let maxLiquidityPath: string[] | undefined = undefined;

    for (const route of allPaths) {
      const liquidity = getSwapPathOfMaxLiquidity({
        marketsInfo,
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
