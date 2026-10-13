import { describe, expect, it } from "vitest";

import { selectOrderEditorIsRemainingPositionAboveMaxLeverage } from "context/SyntheticsStateContext/selectors/orderEditorSelectors";
import { makeSelectOrderErrorByOrderKey } from "context/SyntheticsStateContext/selectors/orderSelectors";
import { getTriggerDecreaseOrderType } from "domain/synthetics/trade";
import { MOCK_POSITIONS_CONSTANTS } from "domain/testUtils/mockChainData";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { createMockSyntheticsState, MOCK_ACCOUNT } from "domain/testUtils/mockSyntheticsState";
import { ETH_TOKEN, USDC_ADDRESS, USDC_TOKEN } from "domain/testUtils/mockTokens";
import { getTpSlDecreaseAmounts } from "domain/tpsl/sidecar";
import { FULL_POSITION_CLOSE_SIZE_DELTA_USD, getTpSlRemainingPositionWarning } from "domain/tpsl/utils";
import { expandDecimals, formatAmountFree, PRECISION, USD_DECIMALS } from "lib/numbers";
import type { PositionOrderInfo } from "sdk/utils/orders/types";
import { getPositionInfo, getPositionKey } from "sdk/utils/positions";
import type { PositionInfoLoaded } from "sdk/utils/positions/types";
import { convertToTokenAmount } from "sdk/utils/tokens";

const ENTRY_PRICE = expandDecimals(2000, 30);
const { minCollateralUsd, minPositionSizeUsd } = MOCK_POSITIONS_CONSTANTS;

// max leverage 100x, liquidation at 200x: the remaining position fails between the two prices
const marketInfo = createMockMarketInfo(ETH_TOKEN, {
  minCollateralFactor: PRECISION / 100n,
  minCollateralFactorForLiquidation: PRECISION / 200n,
});

function openPosition(isLong: boolean, collateralUsd: number): PositionInfoLoaded {
  const key = getPositionKey(MOCK_ACCOUNT, marketInfo.marketTokenAddress, USDC_ADDRESS, isLong);
  const sizeInUsd = expandDecimals(collateralUsd * 80 * 100, 28);

  return getPositionInfo({
    position: {
      key,
      contractKey: key,
      account: MOCK_ACCOUNT,
      marketAddress: marketInfo.marketTokenAddress,
      collateralTokenAddress: USDC_ADDRESS,
      sizeInUsd,
      sizeInTokens: convertToTokenAmount(sizeInUsd, ETH_TOKEN.decimals, ENTRY_PRICE)!,
      collateralAmount: expandDecimals(collateralUsd * 100, USDC_TOKEN.decimals - 2),
      pendingBorrowingFeesUsd: 0n,
      increasedAtTime: 0n,
      decreasedAtTime: 0n,
      isLong,
      fundingFeeAmount: 0n,
      claimableLongTokenAmount: 0n,
      claimableShortTokenAmount: 0n,
      pnl: 0n,
      positionFeeAmount: 0n,
      traderDiscountAmount: 0n,
      uiFeeAmount: 0n,
      pendingImpactAmount: 0n,
      positionValueInUsd: 0n,
      data: "",
    },
    marketInfo,
    minCollateralUsd: minCollateralUsd!,
    showPnlInLeverage: false,
  }) as PositionInfoLoaded;
}

function getAmounts(position: PositionInfoLoaded, triggerPrice: bigint, closePercent: number, keepLeverage: boolean) {
  return getTpSlDecreaseAmounts({
    position,
    closeSizeUsd: (position.sizeInUsd * BigInt(closePercent)) / 100n,
    triggerPrice,
    triggerOrderType: getTriggerDecreaseOrderType({
      triggerPrice,
      markPrice: position.markPrice,
      isLong: position.isLong,
    }),
    keepLeverage,
    isLimit: false,
    limitPrice: undefined,
    minCollateralUsd,
    minPositionSizeUsd,
    uiFeeFactor: 0n,
    userReferralInfo: undefined,
    isSetAcceptablePriceImpactEnabled: false,
  })!;
}

/** the order the Add TP/SL modal sends for these amounts, as the Orders tab and the Order Editor read it back */
function getState(
  position: PositionInfoLoaded,
  amounts: ReturnType<typeof getAmounts>,
  editor: { triggerPrice: bigint; sizeDeltaUsd: bigint }
) {
  const order = {
    key: "order",
    account: MOCK_ACCOUNT,
    marketAddress: marketInfo.marketTokenAddress,
    marketInfo,
    indexToken: ETH_TOKEN,
    initialCollateralToken: USDC_TOKEN,
    initialCollateralTokenAddress: USDC_ADDRESS,
    targetCollateralToken: USDC_TOKEN,
    initialCollateralDeltaAmount: amounts.collateralDeltaAmount,
    sizeDeltaUsd: amounts.isFullClose ? FULL_POSITION_CLOSE_SIZE_DELTA_USD : amounts.sizeDeltaUsd,
    triggerPrice: amounts.triggerPrice,
    acceptablePrice: amounts.acceptablePrice,
    minOutputAmount: 0n,
    swapPath: [],
    isLong: position.isLong,
    isTwap: false,
    isSwap: false,
    orderType: amounts.triggerOrderType,
    decreasePositionSwapType: amounts.decreaseSwapType,
    uiFeeFactor: 0n,
  } as unknown as PositionOrderInfo;

  return createMockSyntheticsState({
    marketInfo,
    positionsConstants: MOCK_POSITIONS_CONSTANTS,
    positionsInfoData: { [position.key]: position },
    ordersInfoData: { [order.key]: order },
    orderEditor: {
      editingOrderState: { orderKey: order.key, source: "PositionsList" },
      triggerPriceInputValue: formatAmountFree(editor.triggerPrice, USD_DECIMALS),
      sizeInputValue: formatAmountFree(editor.sizeDeltaUsd, USD_DECIMALS),
    },
  });
}

type Case = {
  type: "tp" | "sl";
  /** bps of the entry price: from the liquidation price for a SL, from the entry for a TP */
  triggerOffsetBps: number;
  closePercent: number;
  keepLeverage: boolean;
  collateralUsd?: number;
  warning: boolean;
  keepLeverageFix?: boolean;
  ordersTabKeys?: string[];
};

describe("partial TP/SL that would leave the position above max leverage at its trigger", () => {
  it("is flagged in Add TP/SL, the Orders tab and the Order Editor exactly where the contract freezes it PRO-4406", () => {
    const cases: Case[] = [
      { type: "sl", triggerOffsetBps: 25, closePercent: 50, keepLeverage: true, warning: true, keepLeverageFix: true },
      {
        type: "sl",
        triggerOffsetBps: 25,
        closePercent: 10,
        keepLeverage: false,
        warning: true,
        keepLeverageFix: false,
      },
      { type: "sl", triggerOffsetBps: 25, closePercent: 50, keepLeverage: false, warning: false },
      { type: "sl", triggerOffsetBps: 25, closePercent: 100, keepLeverage: true, warning: false },
      // at or beyond the liquidation price only the existing warnings show
      {
        type: "sl",
        triggerOffsetBps: 0,
        closePercent: 50,
        keepLeverage: true,
        warning: false,
        ordersTabKeys: ["triggerPrice"],
      },
      {
        type: "sl",
        triggerOffsetBps: -10,
        closePercent: 50,
        keepLeverage: true,
        warning: false,
        ordersTabKeys: ["triggerPrice"],
      },
      // the contract drops the withdrawal when the rest would hold under $1, then the order executes
      { type: "sl", triggerOffsetBps: 25, closePercent: 50, keepLeverage: true, collateralUsd: 2.5, warning: false },
      { type: "tp", triggerOffsetBps: 100, closePercent: 50, keepLeverage: true, warning: false },
    ];

    for (const isLong of [true, false]) {
      for (const c of cases) {
        const position = openPosition(isLong, c.collateralUsd ?? 10);
        const offset = ((isLong ? 1n : -1n) * ENTRY_PRICE * BigInt(c.triggerOffsetBps)) / 10_000n;
        const triggerPrice = (c.type === "sl" ? position.liquidationPrice! : ENTRY_PRICE) + offset;

        const amounts = getAmounts(position, triggerPrice, c.closePercent, c.keepLeverage);
        const entry = {
          decreaseAmounts: amounts,
          getDecreaseAmountsWithoutKeepLeverage: () => getAmounts(position, triggerPrice, c.closePercent, false),
        };
        const modalWarning = getTpSlRemainingPositionWarning({
          position,
          takeProfit: c.type === "tp" ? entry : undefined,
          stopLoss: c.type === "sl" ? entry : undefined,
          keepLeverage: c.keepLeverage,
          minCollateralUsd,
          minPositionSizeUsd,
          userReferralInfo: undefined,
        });

        const state = getState(position, amounts, { triggerPrice, sizeDeltaUsd: amounts.sizeDeltaUsd });
        const ordersTabKeys = makeSelectOrderErrorByOrderKey("order")(state).errors.map((error) => error.key);
        const name = `${isLong ? "long" : "short"} ${JSON.stringify(c)}`;

        expect(modalWarning, name).toEqual(
          c.warning
            ? {
                isTakeProfitAboveMaxLeverage: c.type === "tp",
                isStopLossAboveMaxLeverage: c.type === "sl",
                isKeepLeverageFix: c.keepLeverageFix,
              }
            : undefined
        );
        expect(ordersTabKeys, name).toEqual(c.warning ? ["remainingPositionMaxLeverage"] : c.ordersTabKeys ?? []);
        expect(selectOrderEditorIsRemainingPositionAboveMaxLeverage(state), name).toBe(c.warning);
      }
    }
  });

  it("checks an edit against the collateral withdrawal the order stores PRO-4406", () => {
    for (const isLong of [true, false]) {
      const position = openPosition(isLong, 10);
      const triggerPrice = isLong ? ENTRY_PRICE - ENTRY_PRICE / 1000n : ENTRY_PRICE + ENTRY_PRICE / 1000n;
      const amounts = getAmounts(position, triggerPrice, 50, true);
      const isFlaggedAt = (closePercent: number) =>
        selectOrderEditorIsRemainingPositionAboveMaxLeverage(
          getState(position, amounts, {
            triggerPrice,
            sizeDeltaUsd: (position.sizeInUsd * BigInt(closePercent)) / 100n,
          })
        );

      // a 50% SL with keep leverage passes as created; cut to 40% it keeps the 50% withdrawal and fails at the
      // trigger; cut to 25% the rest exceeds max leverage even without pnl, so the contract drops the withdrawal
      expect([isFlaggedAt(50), isFlaggedAt(40), isFlaggedAt(25)]).toEqual([false, true, false]);
    }
  });
});
