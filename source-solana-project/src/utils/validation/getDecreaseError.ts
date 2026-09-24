import {
  BN_ZERO,
  DUST_USD,
  MAX_SIGNED_USD,
  USD_DECIMALS,
} from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { PositionInfo } from '@/selectors/position/types';
import {
  NextPositionValues,
  TriggerThresholdType,
} from '@/selectors/trade/types';
import { formatAmount, formatLeverage } from '@/utils/legacy/format';
import { getTradeMaxLeverageAllowedByMinCollateralFactor } from '@/utils/tradebox/getTradeMaxLeverageAllowedByMinCollateralFactor';
import { ValidationResult } from '@/utils/validation/types';
import { BN } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import { PriceImpactWarningState } from '@/hooks/tradeHooks/usePriceImpactWarningState';

export function getDecreaseError(p: {
  marketInfo: MarketInfo | undefined;
  inputSizeUsd: BN | undefined;
  sizeDeltaUsd: BN | undefined;
  isTrigger: boolean;
  triggerPrice: BN | undefined;
  markPrice: BN | undefined;
  existingPosition: PositionInfo | undefined;
  nextPositionValues: NextPositionValues | undefined;
  isLong: boolean;
  minCollateralUsd: BN | undefined;
  priceImpactWarning: PriceImpactWarningState;
  isNotEnoughReceiveTokenLiquidity: boolean;
  triggerThresholdType: TriggerThresholdType | undefined;
}): ValidationResult {
  const {
    marketInfo,
    inputSizeUsd,
    sizeDeltaUsd,
    isTrigger,
    triggerPrice,
    // markPrice,
    existingPosition,
    nextPositionValues,
    isLong,
    minCollateralUsd,
    priceImpactWarning,
    isNotEnoughReceiveTokenLiquidity,
    // triggerThresholdType,
  } = p;

  if (!marketInfo) {
    return [t`Select a market`];
  }

  if (sizeDeltaUsd === undefined || sizeDeltaUsd.lte(BN_ZERO)) {
    return [t`Enter an amount`];
  }

  if (isTrigger) {
    if (triggerPrice === undefined || triggerPrice.lte(BN_ZERO)) {
      return [t`Enter a trigger price`];
    }

    if (
      existingPosition?.liquidationPrice &&
      !existingPosition.liquidationPrice.eq(MAX_SIGNED_USD)
    ) {
      if (isLong && triggerPrice.lte(existingPosition.liquidationPrice)) {
        return [t`Price below Liq. Price`];
      }

      if (!isLong && triggerPrice.gte(existingPosition.liquidationPrice)) {
        return [t`Price above Liq. Price`];
      }
    }

    // if (
    //   triggerThresholdType === TriggerThresholdType.Below &&
    //   triggerPrice.gt(markPrice ?? BN_ZERO)
    // ) {
    //   return [t`Price above Mark Price`];
    // }

    // if (
    //   triggerThresholdType === TriggerThresholdType.Above &&
    //   triggerPrice.lt(markPrice ?? BN_ZERO)
    // ) {
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

  if (existingPosition) {
    if (
      !isTrigger &&
      (inputSizeUsd === undefined
        ? undefined
        : inputSizeUsd.gt(existingPosition.sizeInUsd))
    ) {
      return [t`Max close amount exceeded`];
    }

    if (
      existingPosition.sizeInUsd.sub(sizeDeltaUsd).gt(DUST_USD) &&
      (nextPositionValues?.nextCollateralUsd === undefined
        ? undefined
        : nextPositionValues.nextCollateralUsd.lt(minCollateralUsd ?? BN_ZERO))
    ) {
      return [
        t`Leftover collateral below ${formatAmount(minCollateralUsd, USD_DECIMALS, 2)} USD`,
      ];
    }
  }

  if (isNotEnoughReceiveTokenLiquidity) {
    return [t`Insufficient receive token liquidity`];
  }

  if (priceImpactWarning.validationError) {
    return [t`Acknowledgment Required`];
  }

  return [undefined];
}
