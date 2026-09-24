import { BN_10, BN_ZERO } from '@/config/constants';
import { OrderType } from '@/selectors/order/types';
import { formatPriceUsd } from '@/utils/legacy/format';
import {
  isIncreaseOrderType,
  isLimitDecreaseOrderType,
  isLimitIncreaseOrderType,
  isStopLossOrderType,
} from '@/utils/order/isOrderType';
import { applySlippageToPrice } from '@/utils/tradebox/applySlippageToPrice';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';

export type FormatAcceptablePriceParams = {
  orderType: OrderType;
  isLong: boolean;
  isIncrease?: boolean;
  /** Raw on-chain acceptable price. */
  acceptablePrice?: BN | null;
  /** Raw on-chain trigger price; used for limit-order fallback. */
  triggerPrice?: BN | null;
  indexTokenDecimals?: number;
  displayDecimals?: number;
  isDisplayDecimals?: boolean;
  fallbackToZero?: boolean;
};

function resolveSlippageBps(): number {
  return useAppStore.getState().TradeboxNew.slippage;
}

function resolveIsIncrease(
  orderType: OrderType,
  isIncrease?: boolean
): boolean {
  if (isIncrease !== undefined) {
    return isIncrease;
  }

  return isIncreaseOrderType(orderType);
}

function scaleOrderPrice(price: BN, indexTokenDecimals: number): BN {
  return new BN(price.toString()).mul(BN_10.pow(new BN(indexTokenDecimals)));
}

function isNoLimitScenario(params: FormatAcceptablePriceParams): boolean {
  // Only stop-loss orders use sentinel acceptable prices (0 / MAX) for "no limit".
  // Limit TP/increase orders may have 0 or extreme values on-chain when unset;
  // those should go through limit-order fallback instead.
  return isStopLossOrderType(params.orderType);
}

function shouldUseLimitOrderFallback(
  params: FormatAcceptablePriceParams
): boolean {
  const { orderType, triggerPrice, indexTokenDecimals } = params;

  return (
    indexTokenDecimals !== undefined &&
    triggerPrice !== undefined &&
    triggerPrice !== null &&
    !triggerPrice.isZero() &&
    (isLimitIncreaseOrderType(orderType) ||
      isLimitDecreaseOrderType(orderType))
  );
}

function needsLimitOrderFallback(params: FormatAcceptablePriceParams): boolean {
  if (!shouldUseLimitOrderFallback(params)) {
    return false;
  }

  const { acceptablePrice, triggerPrice, indexTokenDecimals } = params;
  const triggerScaled = scaleOrderPrice(triggerPrice!, indexTokenDecimals!);

  if (!acceptablePrice || acceptablePrice.isZero()) {
    return true;
  }

  const acceptableScaled = scaleOrderPrice(acceptablePrice, indexTokenDecimals!);

  return acceptableScaled.gt(triggerScaled.muln(1000));
}

function resolveDisplayAcceptablePriceRaw(
  params: FormatAcceptablePriceParams
): BN | undefined {
  const { acceptablePrice, triggerPrice, orderType, isLong, isIncrease } = params;
  const slippageBps = resolveSlippageBps();

  if (needsLimitOrderFallback(params)) {
    return applySlippageToPrice(
      slippageBps,
      triggerPrice!,
      isLimitIncreaseOrderType(orderType),
      isLong
    );
  }

  if (acceptablePrice) {
    return acceptablePrice;
  }

  if (triggerPrice && !triggerPrice.isZero()) {
    return applySlippageToPrice(
      slippageBps,
      triggerPrice,
      resolveIsIncrease(orderType, isIncrease),
      isLong
    );
  }

  return undefined;
}

function getAcceptablePriceComparator(
  params: FormatAcceptablePriceParams
): '≤' | '≥' {
  const { orderType, isLong } = params;
  const isIncrease = resolveIsIncrease(orderType, params.isIncrease);

  if (orderType === OrderType.LimitIncrease) {
    return isLong ? '≤' : '≥';
  }

  if (orderType === OrderType.LimitDecrease) {
    return isLong ? '≥' : '≤';
  }

  if (isIncrease) {
    return isLong ? '≤' : '≥';
  }

  return isLong ? '≥' : '≤';
}

function formatPriceForDisplay(
  rawPrice: BN,
  params: FormatAcceptablePriceParams
): string | undefined {
  const formatOpts = {
    displayDecimals: params.displayDecimals,
    isDisplayDecimals: params.isDisplayDecimals,
    fallbackToZero: params.fallbackToZero,
  };

  const scaledPrice = params.indexTokenDecimals
    ? scaleOrderPrice(rawPrice, params.indexTokenDecimals)
    : rawPrice;

  return formatPriceUsd(scaledPrice, formatOpts);
}

export function formatAcceptablePriceDisplay(
  params: FormatAcceptablePriceParams
): string {
  if (isNoLimitScenario(params)) {
    return t`No limit`;
  }

  const rawPrice = resolveDisplayAcceptablePriceRaw(params);

  if (!rawPrice || rawPrice.lte(BN_ZERO)) {
    return '-';
  }

  const formattedPrice = formatPriceForDisplay(rawPrice, params);

  if (!formattedPrice || formattedPrice === 'N/A') {
    return '-';
  }

  const comparator = getAcceptablePriceComparator(params);

  return `${comparator} ${formattedPrice}`;
}
