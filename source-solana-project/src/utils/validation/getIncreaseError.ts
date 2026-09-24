import { PriceImpactWarningState } from '@/hooks/tradeHooks/usePriceImpactWarningState';
import { BN_ZERO, MIN_POSITION_SIZE_USD } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { TokenData } from '@/selectors/token/types';
import { TradeFees } from '@/selectors/fee/types';
import { NextPositionValues, SwapPathStats } from '@/selectors/trade/types';
import { formatLeverage, formatUsd } from '@/utils/legacy/format';
import { getIsEquivalentTokens } from '@/utils/token/getIsEquivalentTokens';
import { getTradeMaxLeverageAllowedByMinCollateralFactor } from '@/utils/tradebox/getTradeMaxLeverageAllowedByMinCollateralFactor';
import { getIsMaxLeverageExceeded } from '@/utils/validation/getIsMaxLeverageExceeded';
import { ValidationResult } from '@/utils/validation/types';
import { BN } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import { PositionInfo } from '@/selectors/position/types';
import { getWrappedSymbol } from '../token/getWrappedSymbol';

export function getIncreaseError(p: {
  marketInfo: MarketInfo | undefined;
  indexToken: TokenData | undefined;
  initialCollateralToken: TokenData | undefined;
  initialCollateralAmount: BN | undefined;
  initialCollateralUsd: BN | undefined;
  targetCollateralToken: TokenData | undefined;
  collateralUsd: BN | undefined;
  sizeDeltaUsd: BN | undefined;
  nextPositionValues: NextPositionValues | undefined;
  existingPosition: PositionInfo | undefined;
  fees: TradeFees | undefined;
  markPrice: BN | undefined;
  priceImpactWarning: PriceImpactWarningState;
  triggerPrice: BN | undefined;
  swapPathStats: SwapPathStats | undefined;
  collateralLiquidity: BN | undefined;
  longLiquidity: BN | undefined;
  shortLiquidity: BN | undefined;
  minCollateralUsd: BN | undefined;
  isLong: boolean;
  isLimit: boolean;
  nextLeverageWithoutPnl: BN | undefined;
}): ValidationResult {
  const {
    marketInfo,
    indexToken,
    initialCollateralToken,
    initialCollateralAmount,
    initialCollateralUsd,
    targetCollateralToken,
    priceImpactWarning,
    collateralUsd,
    sizeDeltaUsd,
    existingPosition,
    fees,
    swapPathStats,
    collateralLiquidity,
    longLiquidity,
    shortLiquidity,
    isLong,
    markPrice,
    triggerPrice,
    isLimit,
    nextPositionValues,
    // nextLeverageWithoutPnl,
  } = p;

  if (!marketInfo || !indexToken) {
    return [t`Select a market`];
  }

  if (!initialCollateralToken) {
    return [t`Select a Pay token`];
  }

  if (!targetCollateralToken) {
    return [t`Select a collateral`];
  }

  if (initialCollateralToken.shouldWrap) {
    return [
      t`Auto-wrapping isn't supported yet. Please select ${getWrappedSymbol(initialCollateralToken)} instead`,
    ];
  }

  if (
    initialCollateralAmount === undefined ||
    initialCollateralUsd === undefined ||
    initialCollateralAmount.lte(BN_ZERO) ||
    initialCollateralUsd.lte(BN_ZERO) ||
    sizeDeltaUsd === undefined ||
    !fees?.payTotalFees
  ) {
    return [t`Enter an amount`];
  }

  if (initialCollateralAmount.gt(initialCollateralToken.balance ?? BN_ZERO)) {
    return [t`Insufficient ${initialCollateralToken?.symbol} balance`];
  }

  const isNeedSwap = !getIsEquivalentTokens(
    initialCollateralToken,
    targetCollateralToken
  );

  if (isNeedSwap) {
    if (!swapPathStats?.swapPath?.length) {
      return [t`No swap path found`, 'noSwapPath'];
    }

    if (!isLimit) {
      if (
        collateralLiquidity === undefined ||
        collateralLiquidity.lt(initialCollateralUsd ?? BN_ZERO)
      ) {
        return [t`Insufficient liquidity to swap collateral`];
      }
    }
  }

  if (
    !existingPosition &&
    fees.payTotalFees?.deltaUsd &&
    fees.payTotalFees?.deltaUsd.lt(BN_ZERO) &&
    fees.payTotalFees?.deltaUsd.abs().gt(initialCollateralUsd ?? BN_ZERO)
  ) {
    return [t`Fees exceed amount`];
  }

  const _minCollateralUsd = MIN_POSITION_SIZE_USD;

  // console.log('collateralUsd', collateralUsd?.toString());
  // console.log('_minCollateralUsd', _minCollateralUsd.toString());

  if (
    !existingPosition &&
    (collateralUsd === undefined
      ? undefined
      : collateralUsd.lt(_minCollateralUsd))
  ) {
    return [t`Min collateral: ${formatUsd(_minCollateralUsd)}`];
  }

  if (
    nextPositionValues?.nextCollateralUsd === undefined
      ? undefined
      : nextPositionValues.nextCollateralUsd.lt(_minCollateralUsd)
  ) {
    return [t`Min collateral: ${formatUsd(_minCollateralUsd)}`];
  }

  if (sizeDeltaUsd.lte(BN_ZERO)) {
    return [t`Enter an amount`];
  }

  if (!isLimit) {
    if (
      isLong &&
      (longLiquidity === undefined || longLiquidity.lt(sizeDeltaUsd))
    ) {
      return [t`Max ${indexToken.symbol} long exceeded`];
    }

    if (
      !isLong &&
      (shortLiquidity === undefined || shortLiquidity.lt(sizeDeltaUsd))
    ) {
      return [t`Max ${indexToken.symbol} short exceeded`];
    }
  }

  if (isLimit) {
    if (markPrice === undefined) {
      return [t`Loading...`];
    }

    if (triggerPrice === undefined || triggerPrice.lt(BN_ZERO)) {
      return [t`Enter a price`];
    }

    // if (isLong && markPrice.lt(triggerPrice)) {
    //   return [t`Price above Mark Price`];
    // }

    // if (!isLong && markPrice.gt(triggerPrice)) {
    //   return [t`Price below Mark Price`];
    // }
  }

  const maxAllowedLeverage = getTradeMaxLeverageAllowedByMinCollateralFactor(
    marketInfo?.minCollateralFactor
  );

  if (
    nextPositionValues?.nextLeverage !== undefined &&
    nextPositionValues?.nextLeverage.gt(maxAllowedLeverage)
  ) {
    return [t`Max leverage: ${formatLeverage(maxAllowedLeverage)}`];
  }

  if (priceImpactWarning.validationError) {
    return [t`Acknowledgment Required`];
  }

  if (nextPositionValues?.nextLeverage !== undefined) {
    const maxLeverageError = getIsMaxLeverageExceeded(
      nextPositionValues?.nextLeverage,
      marketInfo,
      isLong,
      sizeDeltaUsd
    );

    if (maxLeverageError) {
      return [t`Max. Leverage exceeded`, 'maxLeverage'];
    }
  }

  if (
    nextPositionValues?.nextLiqPrice !== undefined &&
    markPrice !== undefined
  ) {
    if (isLong && nextPositionValues.nextLiqPrice.gt(markPrice)) {
      return [t`Invalid liq. price`, 'liqPrice > markPrice'];
    }

    if (!isLong && nextPositionValues.nextLiqPrice.lt(markPrice)) {
      return [t`Invalid liq. price`, 'liqPrice > markPrice'];
    }
  }

  return [undefined];
}
