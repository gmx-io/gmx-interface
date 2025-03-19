import { ethers } from "ethers";

import {
  MarketsInfoData,
  getAvailableUsdLiquidityForCollateral,
  getOppositeCollateral,
  getTokenPoolType,
} from "domain/synthetics/markets";
import { getByKey } from "lib/objects";

export * from "sdk/utils/swapStats";

export function getMaxSwapPathLiquidity(p: {
  marketsInfoData: MarketsInfoData;
  swapPath: string[];
  initialCollateralAddress: string;
}) {
  const { marketsInfoData, swapPath, initialCollateralAddress } = p;

  if (swapPath.length === 0) {
    return 0n;
  }

  let minMarketLiquidity = ethers.MaxUint256;
  let tokenInAddress = initialCollateralAddress;

  for (const marketAddress of swapPath) {
    const marketInfo = getByKey(marketsInfoData, marketAddress);

    if (!marketInfo) {
      return 0n;
    }

    const tokenOut = getOppositeCollateral(marketInfo, tokenInAddress);

    if (!tokenOut) {
      return 0n;
    }

    const isTokenOutLong = getTokenPoolType(marketInfo, tokenOut.address) === "long";
    const liquidity = getAvailableUsdLiquidityForCollateral(marketInfo, isTokenOutLong);

    if (liquidity < minMarketLiquidity) {
      minMarketLiquidity = liquidity;
    }

    tokenInAddress = tokenOut.address;
  }

  if (minMarketLiquidity === ethers.MaxUint256) {
    return 0n;
  }

  return minMarketLiquidity;
}
