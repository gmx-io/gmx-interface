import { BN_ZERO } from '@/config/constants';
import { MarketsInfo } from '@/selectors/market/types';
import { SwapPathStats, SwapStats } from '@/selectors/trade/types';
import { getMarketOppositeCollateral } from '@/utils/market/getMarketOppositeCollateral';
import { getSwapStats } from '@/utils/tradebox/getSwapStats';
import { BN } from '@coral-xyz/anchor';
import { isNativeToken } from '@/utils/token/isNativeToken';
import { isWrappedNativeToken } from '@/utils/token/isWrappedNativeToken';

export function getSwapPathStats(p: {
  marketsInfo?: MarketsInfo;
  swapPath?: string[];
  initialCollateralAddress: string;
  wrappedNativeTokenAddress: string;
  usdIn: BN;
  shouldUnwrapNativeToken: boolean;
  shouldApplyPriceImpact: boolean;
}): SwapPathStats | undefined {
  const {
    marketsInfo,
    swapPath,
    initialCollateralAddress,
    usdIn,
    shouldUnwrapNativeToken,
    shouldApplyPriceImpact,
  } = p;

  if (!marketsInfo || !swapPath || swapPath.length === 0) {
    return undefined;
  }

  const swapSteps: SwapStats[] = [];

  let usdOut = usdIn;

  let tokenInAddress = initialCollateralAddress;
  let tokenOutAddress = initialCollateralAddress;

  let totalSwapPriceImpactDeltaUsd = BN_ZERO;
  let totalSwapFeeUsd = BN_ZERO;

  for (let i = 0; i < swapPath.length; i++) {
    const marketAddress = swapPath[i];
    const marketInfo = marketsInfo[marketAddress];

    if (!marketInfo) {
      return undefined;
    }

    const nextTokenAddress = getMarketOppositeCollateral(
      marketInfo,
      tokenInAddress
    );

    if (!nextTokenAddress) return undefined;

    tokenOutAddress = nextTokenAddress.address.toBase58();

    if (
      i === swapPath.length - 1 &&
      shouldUnwrapNativeToken &&
      isWrappedNativeToken(tokenOutAddress)
    ) {
      isNativeToken(tokenOutAddress);
    }

    const swapStep = getSwapStats({
      marketInfo,
      tokenInAddress,
      tokenOutAddress,
      usdIn: usdOut,
      shouldApplyPriceImpact,
    });

    tokenInAddress = swapStep.tokenOutAddress;
    usdOut = swapStep.usdOut;

    totalSwapPriceImpactDeltaUsd = totalSwapPriceImpactDeltaUsd.add(
      swapStep.priceImpactDeltaUsd
    );
    totalSwapFeeUsd = totalSwapFeeUsd.add(swapStep.swapFeeUsd);

    swapSteps.push(swapStep);
  }

  const lastStep = swapSteps[swapSteps.length - 1];
  const targetMarketAddress = lastStep.marketAddress;
  const amountOut = lastStep.amountOut;

  const totalFeesDeltaUsd = BN_ZERO.sub(totalSwapFeeUsd).add(
    totalSwapPriceImpactDeltaUsd
  );

  return {
    swapPath,
    tokenInAddress,
    tokenOutAddress,
    targetMarketAddress,
    swapSteps,
    usdOut,
    amountOut,
    totalSwapFeeUsd,
    totalSwapPriceImpactDeltaUsd,
    totalFeesDeltaUsd,
  };
}
