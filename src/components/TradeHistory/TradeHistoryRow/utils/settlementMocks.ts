import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import type { TokenData } from "domain/synthetics/tokens";
import type { LifecycleSettlementData } from "domain/synthetics/tradeHistory/useLifecycleSettlement";
import type { PositionTradeAction } from "sdk/utils/tradeHistory/types";
import { TradeActionType } from "sdk/utils/tradeHistory/types";

export const USDC = {
  address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  symbol: "USDC",
  decimals: 6,
  isStable: true,
} as TokenData;

export const WETH = {
  address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  symbol: "WETH",
  decimals: 18,
  isStable: false,
} as TokenData;

/** Short market: the pnl token is the short token, so a plain close pays out in the collateral token. */
export const SHORT_MARKET = { longToken: WETH, shortToken: USDC };

export const POSITION_KEY = "0x5cc6146539659b0e38cf9abf31342fa6f75f6409823735fdfaac09dfebb99f9b";
export const OPEN_ORDER_KEY = "0x1111111111111111111111111111111111111111111111111111111111111111";
export const CLOSE_ORDER_KEY = "0x2222222222222222222222222222222222222222222222222222222222222222";
export const LIFECYCLE_ID = `${POSITION_KEY}:${OPEN_ORDER_KEY}`;

/** 1 collateral unit = exactly $1, so lifecycle arithmetic in the fixtures stays readable. */
export const UNIT_PRICE = 10n ** 30n;
export const USD = 10n ** 30n;
export const USDC_UNIT = 10n ** 6n;

const BASE_ROW = {
  eventName: TradeActionType.OrderExecuted,
  account: "0x414da6c7c50eadfbd4c67c902c7daf59f58d32c7",
  srcChainId: 0,
  swapPath: [],
  positionKey: POSITION_KEY,
  positionLifecycleId: LIFECYCLE_ID,
  marketInfo: SHORT_MARKET,
  isLong: false,
  initialCollateralToken: USDC,
  targetCollateralToken: USDC,
  collateralTokenPriceMin: UNIT_PRICE,
  basePnlUsd: 0n,
  positionFeeAmount: 0n,
  traderDiscountAmount: 0n,
  borrowingFeeAmount: 0n,
  fundingFeeAmount: 0n,
  liquidationFeeAmount: 0n,
  priceImpactDiffUsd: 0n,
  decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
};

export function buildIncreaseRow(overrides: Partial<PositionTradeAction> & { id: string }): PositionTradeAction {
  return { ...BASE_ROW, orderType: OrderType.MarketIncrease, ...overrides } as unknown as PositionTradeAction;
}

export function buildDecreaseRow(overrides: Partial<PositionTradeAction> & { id: string }): PositionTradeAction {
  return { ...BASE_ROW, orderType: OrderType.MarketDecrease, ...overrides } as unknown as PositionTradeAction;
}

export function buildLifecycleData({
  rows,
  requestedByOrderKey = {},
  swapLegs = [],
  hasFundingSettlement = false,
  isTruncated = false,
}: {
  rows: PositionTradeAction[];
  requestedByOrderKey?: Record<string, { amount: bigint; tokenAddress?: string; swapPath?: string[] }>;
  swapLegs?: LifecycleSettlementData["swapLegsById"][string][];
  hasFundingSettlement?: boolean;
  isTruncated?: boolean;
}): LifecycleSettlementData {
  return {
    rows,
    ordersByKey: Object.fromEntries(
      Object.entries(requestedByOrderKey).map(([orderKey, requested]) => [
        orderKey,
        {
          orderKey,
          initialCollateralTokenAddress: requested.tokenAddress ?? USDC.address,
          initialCollateralDeltaAmount: requested.amount,
          swapPath: requested.swapPath ?? [],
        },
      ])
    ),
    swapLegsById: Object.fromEntries(swapLegs.map((leg) => [`${leg.orderKey}:${leg.marketAddress}`, leg])),
    hasFundingSettlement,
    isTruncated,
  };
}

// Arbitrum tx 0x936261d3c5394be68ccd53173b116f8f2e6c5d007dd3ab88943ded9b6e69f38e
export const anchorOpenRow = buildIncreaseRow({
  id: "0x88e1cbd6ad1de95d6d0c17a9d1e0f5b2cd0bd9d2fd58b02f37b0f8d1ecb2f001:20",
  orderKey: OPEN_ORDER_KEY,
  sizeDeltaUsd: 9959808360000000000000000000000000n,
  positionSizeInUsd: 9959808360000000000000000000000000n,
  initialCollateralDeltaAmount: 996214440n,
  collateralTokenPriceMin: 999815895000000000000000000000n,
  positionFeeAmount: 3984800n,
  traderDiscountAmount: 199240n,
} as unknown as Partial<PositionTradeAction> & { id: string });

export const anchorCloseRow = buildDecreaseRow({
  id: "0x936261d3c5394be68ccd53173b116f8f2e6c5d007dd3ab88943ded9b6e69f38e:30",
  orderKey: CLOSE_ORDER_KEY,
  sizeDeltaUsd: 9959808360000000000000000000000000n,
  positionSizeInUsd: 0n,
  initialCollateralDeltaAmount: 996214440n,
  collateralTokenPriceMin: 999757458143159100000000000000n,
  basePnlUsd: 294764671686842964882169505960200n,
  positionFeeAmount: 3984889n,
  traderDiscountAmount: 199244n,
  borrowingFeeAmount: 12850n,
  fundingFeeAmount: 338315n,
  totalImpactUsd: 39839233440000000000000000000000n,
  priceImpactUsd: 16647709627538459795542642163244n,
  swapFeeUsd: 167301952563420478623863092367n,
  swapImpactUsd: 40202004253824880382311194750n,
} as unknown as Partial<PositionTradeAction> & { id: string });
