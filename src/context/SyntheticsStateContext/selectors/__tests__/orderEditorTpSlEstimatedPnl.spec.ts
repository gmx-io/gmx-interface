import { describe, expect, it } from "vitest";

import { mockPositionInfo } from "domain/synthetics/testUtils/mocks";
import { createMockMarketInfo, MOCK_MARKET_ADDRESS } from "domain/testUtils/mockMarketInfo";
import { createMockSyntheticsState, MOCK_ACCOUNT } from "domain/testUtils/mockSyntheticsState";
import { ETH_ADDRESS, ETH_TOKEN, USDC_ADDRESS, USDC_TOKEN } from "domain/testUtils/mockTokens";
import { expandDecimals, formatDeltaUsd } from "lib/numbers";
import { OrderType, PositionOrderInfo } from "sdk/utils/orders/types";
import type { PositionInfo } from "sdk/utils/positions/types";

import {
  selectOrderEditorPositionOrderError,
  selectOrderEditorTpSlEstimatedPnl,
  selectOrderEditorTriggerPrice,
} from "../orderEditorSelectors";

const usd = (value: number) => expandDecimals(value, 30);
const marketInfo = createMockMarketInfo();

// 10 000 of size on 1 000 of margin unless set, opened at the 2 000 mark
function makePosition(
  isLong: boolean,
  collateralTokenAddress = USDC_ADDRESS,
  { size = 10_000, margin = 1_000, liquidationPrice = isLong ? 1820 : 2180 } = {}
): PositionInfo {
  const params = { marketInfo, collateralTokenAddress, account: MOCK_ACCOUNT, isLong };
  return mockPositionInfo(
    { ...params, sizeInUsd: usd(size), collateralUsd: usd(margin) },
    { isLong, liquidationPrice: usd(liquidationPrice) }
  );
}

function makeOrder(position: PositionInfo, orderType: OrderType, overrides: Partial<PositionOrderInfo> = {}) {
  return {
    key: "order-key",
    account: MOCK_ACCOUNT,
    marketAddress: MOCK_MARKET_ADDRESS,
    marketInfo,
    indexToken: ETH_TOKEN,
    initialCollateralToken: position.collateralToken,
    initialCollateralTokenAddress: position.collateralTokenAddress,
    targetCollateralToken: position.collateralToken,
    initialCollateralDeltaAmount: 0n,
    sizeDeltaUsd: usd(5_000),
    triggerPrice: usd(2_200),
    swapPath: [],
    isLong: position.isLong,
    orderType,
    ...overrides,
  } as unknown as PositionOrderInfo;
}

const long = makePosition(true);
const short = makePosition(false);
const ethCollateral = makePosition(true, ETH_ADDRESS);
const tp = (position: PositionInfo) => makeOrder(position, OrderType.LimitDecrease);
const sl = (position: PositionInfo) => makeOrder(position, OrderType.StopLossDecrease);
const swapsToEth = makeOrder(long, OrderType.LimitDecrease, {
  targetCollateralToken: ETH_TOKEN,
  swapPath: [MOCK_MARKET_ADDRESS],
});
// 200 of size on 3 of margin: the contract cancels the SL's collateral withdrawal and closes only 180 of the size
const thinMargin = makePosition(true, USDC_ADDRESS, { size: 200, margin: 3, liquidationPrice: 1980 });
const slWithdrawal = makeOrder(thinMargin, OrderType.StopLossDecrease, {
  initialCollateralDeltaAmount: expandDecimals(27, 5),
  sizeDeltaUsd: usd(180),
});
// the field shows 2200.00 for this stored price
const tpWithLongPrice = makeOrder(long, OrderType.LimitDecrease, { triggerPrice: usd(2200) + expandDecimals(4, 27) });
// a long position closes at the bid, a short one at the ask
const quotedEth = { ...ETH_TOKEN, prices: { minPrice: usd(1999), maxPrice: usd(2001) } };

function makeState(
  position: PositionInfo | undefined,
  order: PositionOrderInfo,
  triggerPriceInputValue: string,
  sizeInputValue: string
) {
  return createMockSyntheticsState({
    marketInfo,
    tokensData: { [USDC_ADDRESS]: USDC_TOKEN, [ETH_ADDRESS]: quotedEth },
    positionsInfoData: position ? { [position.key]: position } : {},
    ordersInfoData: { [order.key]: order },
    orderEditor: {
      editingOrderState: { orderKey: order.key, source: "PositionsList" },
      sizeInputValue,
      triggerPriceInputValue,
    },
  });
}

describe("selectOrderEditorTpSlEstimatedPnl", () => {
  it.each<[string, PositionInfo | undefined, PositionOrderInfo, string, string, string]>([
    ["a long TP", long, tp(long), "2200", "5000", "+$500.00 (+50.00%)"],
    ["a long SL", long, sl(long), "1900", "5000", "-$250.00 (-25.00%)"],
    ["a short TP", short, tp(short), "1800", "5000", "+$500.00 (+50.00%)"],
    ["a short SL", short, sl(short), "2100", "5000", "-$250.00 (-25.00%)"],
    ["a TP without a position", undefined, tp(long), "2200", "5000", "-"],
    ["an empty close size", long, tp(long), "2200", "", "-"],
    ["a close size above the position", long, tp(long), "2200", "10000.01", "-"],
    ["a full close", long, tp(long), "2200", "10000", "+$1,000.00 (+100.00%)"],
    [
      "an unchanged price with more decimals than the field",
      long,
      tpWithLongPrice,
      "2200.00",
      "5000",
      "+$500.01 (+50.00%)",
    ],
    ["a long SL at the liquidation price", long, sl(long), "1820", "5000", "-$1,000.00 (-100.00%)"],
    ["a short SL past the liquidation price", short, sl(short), "2200", "5000", "-$1,000.00 (-100.00%)"],
    // 0.5 ETH of margin is worth 1 100 at the 2 200 trigger
    ["a TP on index-token collateral", ethCollateral, tp(ethCollateral), "2200", "5000", "+$500.00 (+45.45%)"],
    ["a TP that swaps the output to another token", long, swapsToEth, "2200", "5000", "+$500.00 (+50.00%)"],
    ["a thin-margin SL that withdraws collateral", thinMargin, slWithdrawal, "1995", "180", "-$0.45 (-15.00%)"],
    ["a limit increase", long, makeOrder(long, OrderType.LimitIncrease), "1900", "5000", "-"],
  ])("shows the Est. PnL for %s", (_, position, order, triggerPriceInputValue, sizeInputValue, expected) => {
    const pnl = selectOrderEditorTpSlEstimatedPnl(makeState(position, order, triggerPriceInputValue, sizeInputValue));
    const text = pnl ? formatDeltaUsd(pnl.pnlUsd, pnl.pnlPercentage)! : "-";

    expect(text.replace(/\s/g, "")).toBe(expected.replace(/\s/g, ""));
  });

  it.each<[string, PositionInfo, PositionOrderInfo, string, string]>([
    ["a long TP at the bid", long, tp(long), "1999", "Set trigger price above mark price"],
    ["a long SL at the bid", long, sl(long), "1999", "Set trigger price below mark price"],
    ["a long SL between the bid and the ask", long, sl(long), "2000", "Set trigger price below mark price"],
    ["a short TP at the ask", short, tp(short), "2001", "Set trigger price below mark price"],
    ["a short SL at the ask", short, sl(short), "2001", "Set trigger price above mark price"],
    ["a short SL between the bid and the ask", short, sl(short), "2000", "Set trigger price above mark price"],
  ])("shows - when the button asks for another price for %s", (_, position, order, triggerPriceInputValue, error) => {
    const state = makeState(position, order, triggerPriceInputValue, "5000");

    expect(selectOrderEditorTpSlEstimatedPnl(state)).toBeUndefined();
    expect(selectOrderEditorPositionOrderError(state)).toBe(error);
  });
});

describe("selectOrderEditorTriggerPrice", () => {
  const limitWithLongPrice = makeOrder(long, OrderType.LimitIncrease, { triggerPrice: tpWithLongPrice.triggerPrice });

  it.each<[string, PositionOrderInfo, bigint]>([
    ["a TP", tpWithLongPrice, tpWithLongPrice.triggerPrice],
    ["a limit increase", limitWithLongPrice, usd(2200)],
  ])("reads the unchanged price field of %s", (_, order, expected) => {
    expect(selectOrderEditorTriggerPrice(makeState(long, order, "2200.00", "5000"))).toBe(expected);
  });
});
