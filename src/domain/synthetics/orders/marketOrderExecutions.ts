import { OrderType } from "./types";

export const MARKET_POSITION_ORDER_TYPES = [OrderType.MarketIncrease, OrderType.MarketDecrease];

export type MarketOrderKind = "perp" | "swap";
export type MarketOrderPhase = "increase" | "decrease";
export type MarketOrderSide = "long" | "short";

export type MarketOrderExecutionAction = {
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
  orderCreatedTimestamp: number | null;
  orderCreatedTxnHash: string | null;
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
};

export type MarketPerpOrderExecutionRow = MarketOrderExecutionRowBase & {
  kind: "perp";
  orderType: OrderType.MarketIncrease | OrderType.MarketDecrease;
  phase: MarketOrderPhase;
  side: MarketOrderSide;
  sizeDeltaUsd: string;
};

export type MarketSwapOrderExecutionRow = MarketOrderExecutionRowBase & {
  kind: "swap";
  orderType: OrderType.MarketSwap;
  initialCollateralTokenAddress: string;
  initialCollateralDeltaAmount: string;
  shouldUnwrapNativeToken: boolean;
  swapPath: string[];
};

export type MarketOrderExecutionRow = MarketPerpOrderExecutionRow | MarketSwapOrderExecutionRow;

export type MarketOrderExecutionPercentile = {
  percentile: number;
  delaySeconds: number | null;
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
  medianDelaySeconds: number | null;
  p95DelaySeconds: number | null;
  percentiles: MarketOrderExecutionPercentile[];
  delayThresholds: MarketOrderExecutionThresholdStat[];
};

export function buildMarketOrderExecutionRows(
  executionActions: MarketOrderExecutionAction[]
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

    const baseRow: MarketOrderExecutionRowBase = {
      orderKey: action.orderKey,
      account: action.account,
      marketAddress: action.marketAddress ?? "",
      submittedTimestamp: action.orderCreatedTimestamp,
      submittedTransactionHash: action.orderCreatedTxnHash,
      executedTimestamp: action.timestamp,
      executedTransactionHash: action.transactionHash,
      delaySeconds: getDelaySeconds(action.timestamp, action.orderCreatedTimestamp),
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
        },
      ];
    }

    if (perpOrderType === null || action.isLong === null) {
      return [];
    }

    return [
      {
        ...baseRow,
        kind: "perp",
        orderType: perpOrderType,
        phase: perpOrderType === OrderType.MarketIncrease ? "increase" : "decrease",
        side: action.isLong ? "long" : "short",
        sizeDeltaUsd: action.sizeDeltaUsd ?? "0",
      },
    ];
  });
}

function getDelaySeconds(executedTimestamp: number, submittedTimestamp: number | null) {
  if (submittedTimestamp === null || submittedTimestamp > executedTimestamp) {
    return null;
  }

  return executedTimestamp - submittedTimestamp;
}
