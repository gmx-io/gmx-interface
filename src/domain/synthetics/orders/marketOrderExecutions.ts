import { OrderType } from "./types";

export const MARKET_POSITION_ORDER_TYPES = [OrderType.MarketIncrease, OrderType.MarketDecrease];
export const MARKET_ORDER_EXECUTION_MAX_REFERENCE_AGE_SECONDS = 60;

export type MarketOrderKind = "perp" | "swap";
export type MarketOrderPhase = "increase" | "decrease";
export type MarketOrderSide = "long" | "short";

export type MarketOrderExecutionAction = {
  id: string;
  orderKey: string;
  orderType: OrderType;
  timestamp: number;
  transactionHash: string;
  account: string;
  marketAddress: string | null;
  isLong: boolean | null;
  shouldUnwrapNativeToken: boolean | null;
  initialCollateralTokenAddress: string;
  initialCollateralDeltaAmount: string;
  swapPath: string[];
  sizeDeltaUsd: string | null;
  executionPrice: string | null;
  minOutputAmount: string | null;
  executionAmountOut: string | null;
  orderCreatedTimestamp: number | null;
  orderCreatedTxnHash: string | null;
  orderCreatedIndexTokenPriceMin: string | null;
  orderCreatedIndexTokenPriceMax: string | null;
  orderCreatedIndexTokenPriceTimestamp: number | null;
  orderCreatedIndexTokenPriceType: string | null;
  indexTokenPriceMin: string | null;
  indexTokenPriceMax: string | null;
  indexTokenPriceTimestamp: number | null;
  indexTokenPriceType: string | null;
  signedFillDeltaBps?: number | null;
};

export type MarketOrderExecutionSample = {
  id: string;
  orderKey: string;
  orderType: OrderType;
  account: string;
  marketAddress: string;
  isLong: boolean;
  sizeDeltaUsd: string;
  orderCreatedTimestamp: number;
  orderCreatedTxnHash: string | null;
  executedTimestamp: number;
  executedTxnHash: string;
  delaySeconds: number;
  referenceAgeSeconds: number;
  creationReferencePrice: string;
  executionReferencePrice: string | null;
  executionPrice: string;
  signedFillDeltaBps: number;
  signedOracleMoveBps: number | null;
  signedExecutionImpactBps: number | null;
};

type MarketOrderExecutionRowBase = {
  orderKey: string;
  account: string;
  marketAddress: string;
  submittedTimestamp: number | null;
  submittedTransactionHash: string | null;
  executedTimestamp: number;
  executedTransactionHash: string;
  delaySeconds: number | null;
  fillDeltaBps: number | null;
  oracleMoveBps: number | null;
  executionImpactBps: number | null;
};

export type MarketPerpOrderExecutionRow = MarketOrderExecutionRowBase & {
  kind: "perp";
  orderType: OrderType.MarketIncrease | OrderType.MarketDecrease;
  phase: MarketOrderPhase;
  side: MarketOrderSide;
  sizeDeltaUsd: string;
  creationReferencePrice: string | null;
  executionReferencePrice: string | null;
  executionPrice: string | null;
  referenceAgeSeconds: number | null;
  executionReferenceAgeSeconds: number | null;
};

export type MarketSwapOrderExecutionRow = MarketOrderExecutionRowBase & {
  kind: "swap";
  orderType: OrderType.MarketSwap;
  initialCollateralTokenAddress: string;
  initialCollateralDeltaAmount: string;
  shouldUnwrapNativeToken: boolean;
  swapPath: string[];
  minOutputAmount: string | null;
  executionAmountOut: string | null;
};

export type MarketOrderExecutionRow = MarketPerpOrderExecutionRow | MarketSwapOrderExecutionRow;

export type MarketOrderExecutionPercentile = {
  percentile: number;
  delaySeconds: number | null;
  absoluteFillDeltaBps: number | null;
};

export type MarketOrderExecutionThresholdStat = {
  threshold: number;
  count: number;
  total: number;
  percentage: number;
};

export type MarketOrderExecutionStats = {
  totalCount: number;
  timingCount: number;
  referencePriceCount: number;
  pricedCount: number;
  oracleMoveCount: number;
  executionImpactCount: number;
  maxReferenceAgeSeconds: number;
  pricedFromTimestamp: number | null;
  medianDelaySeconds: number | null;
  p95DelaySeconds: number | null;
  medianReferenceAgeSeconds: number | null;
  p95ReferenceAgeSeconds: number | null;
  medianSignedFillDeltaBps: number | null;
  medianSignedOracleMoveBps: number | null;
  medianSignedExecutionImpactBps: number | null;
  percentiles: MarketOrderExecutionPercentile[];
  delayThresholds: MarketOrderExecutionThresholdStat[];
  priceThresholds: MarketOrderExecutionThresholdStat[];
  sample: MarketPerpOrderExecutionRow[];
};

export function buildMarketOrderExecutionRows(
  executionActions: MarketOrderExecutionAction[],
  maxReferenceAgeSeconds = MARKET_ORDER_EXECUTION_MAX_REFERENCE_AGE_SECONDS
): MarketOrderExecutionRow[] {
  return executionActions.flatMap<MarketOrderExecutionRow>((action) => {
    const perpOrderType =
      action.orderType === OrderType.MarketIncrease || action.orderType === OrderType.MarketDecrease
        ? action.orderType
        : null;
    const isSwap = action.orderType === OrderType.MarketSwap;

    if (perpOrderType === null && !isSwap) {
      return [];
    }

    const delaySeconds = getReferenceAge(action.timestamp, action.orderCreatedTimestamp);
    const baseRow: MarketOrderExecutionRowBase = {
      orderKey: action.orderKey,
      account: action.account,
      marketAddress: action.marketAddress ?? "",
      submittedTimestamp: action.orderCreatedTimestamp,
      submittedTransactionHash: action.orderCreatedTxnHash,
      executedTimestamp: action.timestamp,
      executedTransactionHash: action.transactionHash,
      delaySeconds,
      fillDeltaBps: null,
      oracleMoveBps: null,
      executionImpactBps: null,
    };

    if (isSwap) {
      return [
        {
          ...baseRow,
          kind: "swap",
          orderType: OrderType.MarketSwap,
          initialCollateralTokenAddress: action.initialCollateralTokenAddress,
          initialCollateralDeltaAmount: action.initialCollateralDeltaAmount,
          shouldUnwrapNativeToken: action.shouldUnwrapNativeToken ?? false,
          swapPath: action.swapPath,
          minOutputAmount: action.minOutputAmount,
          executionAmountOut: action.executionAmountOut,
        },
      ];
    }

    if (perpOrderType === null || action.isLong === null) {
      return [];
    }

    const isBuy = getIsBuyOrder(perpOrderType, action.isLong);
    const creationReferencePrice =
      action.orderCreatedIndexTokenPriceType === "v2"
        ? getDirectionalPrice(action.orderCreatedIndexTokenPriceMin, action.orderCreatedIndexTokenPriceMax, isBuy)
        : null;
    const executionReferencePrice =
      action.indexTokenPriceType === "v2"
        ? getDirectionalPrice(action.indexTokenPriceMin, action.indexTokenPriceMax, isBuy)
        : null;
    const referenceAgeSeconds = getReferenceAge(
      action.orderCreatedTimestamp,
      action.orderCreatedIndexTokenPriceTimestamp
    );
    const executionReferenceAgeSeconds = getReferenceAge(action.timestamp, action.indexTokenPriceTimestamp);
    const hasFreshCreationReference =
      isPositivePrice(creationReferencePrice) &&
      referenceAgeSeconds !== null &&
      referenceAgeSeconds <= maxReferenceAgeSeconds;
    const hasFreshExecutionReference =
      isPositivePrice(executionReferencePrice) &&
      executionReferenceAgeSeconds !== null &&
      executionReferenceAgeSeconds <= maxReferenceAgeSeconds;

    return [
      {
        ...baseRow,
        kind: "perp",
        orderType: perpOrderType,
        phase: perpOrderType === OrderType.MarketIncrease ? "increase" : "decrease",
        side: action.isLong ? "long" : "short",
        sizeDeltaUsd: action.sizeDeltaUsd ?? "0",
        creationReferencePrice,
        executionReferencePrice,
        executionPrice: action.executionPrice,
        referenceAgeSeconds,
        executionReferenceAgeSeconds,
        fillDeltaBps: hasFreshCreationReference
          ? action.signedFillDeltaBps ??
            getSignedPriceDeltaBps({
              referencePrice: creationReferencePrice,
              comparisonPrice: action.executionPrice,
              isBuy,
            })
          : null,
        oracleMoveBps:
          hasFreshCreationReference && hasFreshExecutionReference
            ? getSignedPriceDeltaBps({
                referencePrice: creationReferencePrice,
                comparisonPrice: executionReferencePrice,
                isBuy,
              })
            : null,
        executionImpactBps:
          hasFreshCreationReference && hasFreshExecutionReference
            ? getSignedPriceDeltaBps({
                referencePrice: executionReferencePrice,
                comparisonPrice: action.executionPrice,
                isBuy,
              })
            : null,
      },
    ];
  });
}

export function buildMarketOrderExecutionSampleRows(
  samples: MarketOrderExecutionSample[]
): MarketPerpOrderExecutionRow[] {
  return samples.flatMap<MarketPerpOrderExecutionRow>((sample) => {
    const orderType =
      sample.orderType === OrderType.MarketIncrease || sample.orderType === OrderType.MarketDecrease
        ? sample.orderType
        : null;

    if (orderType === null) {
      return [];
    }

    return [
      {
        kind: "perp",
        orderKey: sample.orderKey,
        orderType,
        account: sample.account,
        marketAddress: sample.marketAddress,
        phase: orderType === OrderType.MarketIncrease ? "increase" : "decrease",
        side: sample.isLong ? "long" : "short",
        sizeDeltaUsd: sample.sizeDeltaUsd,
        submittedTimestamp: sample.orderCreatedTimestamp,
        submittedTransactionHash: sample.orderCreatedTxnHash,
        executedTimestamp: sample.executedTimestamp,
        executedTransactionHash: sample.executedTxnHash,
        delaySeconds: sample.delaySeconds,
        creationReferencePrice: sample.creationReferencePrice,
        executionReferencePrice: sample.executionReferencePrice,
        executionPrice: sample.executionPrice,
        referenceAgeSeconds: sample.referenceAgeSeconds,
        executionReferenceAgeSeconds: null,
        fillDeltaBps: sample.signedFillDeltaBps,
        oracleMoveBps: sample.signedOracleMoveBps,
        executionImpactBps: sample.signedExecutionImpactBps,
      },
    ];
  });
}

export function getSignedPriceDeltaBps({
  referencePrice,
  comparisonPrice,
  isBuy,
}: {
  referencePrice: string | null;
  comparisonPrice: string | null;
  isBuy: boolean;
}): number | null {
  if (!referencePrice || !comparisonPrice) {
    return null;
  }

  try {
    const reference = BigInt(referencePrice);
    const comparison = BigInt(comparisonPrice);

    if (reference <= 0n || comparison <= 0n) {
      return null;
    }

    const delta = isBuy ? reference - comparison : comparison - reference;
    const scaledBps = (delta * 100_000_000n) / reference;

    return Number(scaledBps) / 10_000;
  } catch {
    return null;
  }
}

function getIsBuyOrder(orderType: OrderType.MarketIncrease | OrderType.MarketDecrease, isLong: boolean) {
  return (orderType === OrderType.MarketIncrease && isLong) || (orderType === OrderType.MarketDecrease && !isLong);
}

function getDirectionalPrice(minPrice: string | null, maxPrice: string | null, isBuy: boolean) {
  return isBuy ? maxPrice : minPrice;
}

function getReferenceAge(eventTimestamp: number | null, priceTimestamp: number | null) {
  if (eventTimestamp === null || priceTimestamp === null || priceTimestamp > eventTimestamp) {
    return null;
  }

  return eventTimestamp - priceTimestamp;
}

function isPositivePrice(price: string | null) {
  if (price === null) {
    return false;
  }

  try {
    return BigInt(price) > 0n;
  } catch {
    return false;
  }
}
