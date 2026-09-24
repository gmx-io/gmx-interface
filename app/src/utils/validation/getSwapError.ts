import { PriceImpactWarningState } from '@/hooks/tradeHooks/usePriceImpactWarningState';
import { BN_ZERO } from '@/config/constants';
import { TradeFees } from '@/selectors/fee/types';
import { TokenData, TokensRatio } from '@/selectors/token/types';
import { SwapPathStats } from '@/selectors/trade/types';
import { ValidationResult } from '@/utils/validation/types';
import { BN } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import { getWrappedSymbol } from '../token/getWrappedSymbol';

export function getSwapError(p: {
  fromToken: TokenData | undefined;
  toToken: TokenData | undefined;
  fromTokenAmount: BN | undefined;
  fromUsd: BN | undefined;
  toTokenAmount: BN | undefined;
  toUsd: BN | undefined;
  isLimit: boolean;
  triggerRatio: TokensRatio | undefined;
  markRatio: TokensRatio | undefined;
  fees: TradeFees | undefined;
  swapPathStats: SwapPathStats | undefined;
  priceImpactWarning: PriceImpactWarningState;
  isWrapOrUnwrap: boolean;
  swapLiquidity: BN | undefined;
}): ValidationResult {
  const {
    fromToken,
    toToken,
    fromTokenAmount,
    fromUsd,
    toUsd,
    isLimit,
    triggerRatio,
    // markRatio,
    fees,
    isWrapOrUnwrap,
    priceImpactWarning,
    swapLiquidity,
    swapPathStats,
  } = p;

  if (!fromToken || !toToken) {
    return [t`Select a token`];
  }

  if (fromToken.address.equals(toToken.address)) {
    return [t`Select different tokens`];
  }

  if (fromToken.shouldWrap && !isWrapOrUnwrap) {
    return [
      t`Auto-wrapping during swap isn't supported yet. Please select ${getWrappedSymbol(fromToken)} instead`,
    ];
  }

  if (toToken.shouldWrap && !isWrapOrUnwrap) {
    return [
      t`Auto-unwrapping isn't supported. Please select ${getWrappedSymbol(toToken)} instead`,
    ];
  }

  if (isLimit && isWrapOrUnwrap) {
    return [t`Wrap or unwrap in market`];
  }

  if (
    fromTokenAmount === undefined ||
    fromUsd === undefined ||
    fromTokenAmount.lte(BN_ZERO) ||
    fromUsd.lte(BN_ZERO)
  ) {
    return [t`Enter an amount`];
  }

  if (
    isLimit &&
    (triggerRatio?.ratio === undefined || triggerRatio.ratio.lt(BN_ZERO))
  ) {
    return [t`Enter a  price`];
  }

  if (fromTokenAmount.gt(fromToken.balance ?? BN_ZERO)) {
    return [t`Insufficient ${fromToken?.symbol} balance`];
  }

  if (isWrapOrUnwrap) {
    return [undefined];
  }

  if (
    !isLimit &&
    (toUsd === undefined ||
      swapLiquidity === undefined ||
      swapLiquidity.lt(toUsd))
  ) {
    return [t`Insufficient liquidity`];
  }

  if (
    !swapPathStats?.swapPath ||
    (!isLimit && swapPathStats.swapSteps.some((step) => step.isOutLiquidity))
  ) {
    return [t`Couldn't find a swap path with enough liquidity`];
  }

  if (
    !fees?.payTotalFees ||
    (fees.payTotalFees.deltaUsd.lt(BN_ZERO) &&
      fees.payTotalFees.deltaUsd.abs().gt(fromUsd ?? BN_ZERO))
  ) {
    return [t`Fees exceed Pay amount`];
  }

  // if (isLimit && triggerRatio) {
  //   const isRatioInverted = [
  //     fromToken.wrappedAddress,
  //     fromToken.address,
  //   ].includes(triggerRatio.largestToken.address);

  //   if (
  //     triggerRatio &&
  //     !isRatioInverted &&
  //     (markRatio?.ratio === undefined
  //       ? undefined
  //       : markRatio.ratio.lt(triggerRatio.ratio))
  //   ) {
  //     return [t`Price above Mark Price`];
  //   }

  //   if (
  //     triggerRatio &&
  //     isRatioInverted &&
  //     (markRatio?.ratio === undefined
  //       ? undefined
  //       : markRatio.ratio.gt(triggerRatio.ratio))
  //   ) {
  //     return [t`Price below Mark Price`];
  //   }
  // }

  if (priceImpactWarning.validationError) {
    return [t`Acknowledgment Required`];
  }

  return [undefined];
}
