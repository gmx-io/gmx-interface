export type TradeDirection = "long" | "short" | "swap" | "any";

export type TradeEventName = "OrderCreated" | "OrderExecuted" | "OrderCancelled" | "OrderUpdated" | "OrderFrozen";

export type MarketDirectionFilter = {
  marketAddress: string;
  direction: TradeDirection;
  collateralAddress?: string;
};

export type OrderEventCombination = {
  eventName?: TradeEventName;
  orderType?: number;
  isDepositOrWithdraw?: boolean;
  isTwap?: boolean;
};

export type FetchTradesParams = {
  address: string;
  symbol?: string;
  marketAddress?: string;
  since?: number;
  until?: number;
  actions?: TradeEventName[];
  limit?: number;
  cursor?: string;
};

export type SearchTradesParams = {
  address?: string;
  forAllAccounts?: boolean;
  fromTimestamp?: number;
  toTimestamp?: number;
  marketsDirections?: MarketDirectionFilter[];
  orderEventCombinations?: OrderEventCombination[];
  showDebugValues?: boolean;
  limit?: number;
  cursor?: string;
};

/**
 * Numeric string fields returned by the API are deserialized into bigint by
 * the SDK (consistent with `ApiOrderInfo` / `ApiPositionInfo`).
 *
 * `decreasePositionSwapType` is technically a small enum value but arrives as
 * a stringified bigint, so it is exposed as bigint here for consistency.
 */
export type ApiTradeAction = {
  id: string;
  eventName: TradeEventName;
  account: string;
  orderType: number;
  orderKey: string;
  timestamp: number;
  transactionHash: string;
  swapPath: string[];
  initialCollateralTokenAddress: string;
  initialCollateralDeltaAmount: bigint;
  shouldUnwrapNativeToken?: boolean;
  marketAddress?: string;
  isLong?: boolean;
  sizeDeltaUsd?: bigint;
  sizeDeltaInTokens?: bigint;
  acceptablePrice?: bigint;
  triggerPrice?: bigint;
  executionPrice?: bigint;
  indexTokenPriceMin?: bigint;
  indexTokenPriceMax?: bigint;
  collateralTokenPriceMin?: bigint;
  collateralTokenPriceMax?: bigint;
  minOutputAmount?: bigint;
  pnlUsd?: bigint;
  basePnlUsd?: bigint;
  priceImpactUsd?: bigint;
  priceImpactDiffUsd?: bigint;
  positionFeeAmount?: bigint;
  borrowingFeeAmount?: bigint;
  fundingFeeAmount?: bigint;
  swapFeeUsd?: bigint;
  liquidationFeeAmount?: bigint;
  totalImpactUsd?: bigint;
  executionAmountOut?: bigint;
  swapImpactUsd?: bigint;
  collateralTotalCostAmount?: bigint;
  proportionalPendingImpactUsd?: bigint;
  decreasePositionSwapType?: bigint;
  srcChainId?: number;
  twapGroupId?: string;
  numberOfParts?: number;
  reason?: string;
  reasonBytes?: string;
};

export type TradesListResponse = {
  trades: ApiTradeAction[];
  nextCursor: string | null;
  hasMore: boolean;
};
