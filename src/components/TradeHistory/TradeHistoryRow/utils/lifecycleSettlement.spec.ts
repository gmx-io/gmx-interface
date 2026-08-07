import { i18n } from "@lingui/core";
import { describe, expect, it } from "vitest";

import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import type { PositionTradeAction } from "sdk/utils/tradeHistory/types";

import { getLifecycleSettlementLines, getLifecycleSettlementView } from "./lifecycleSettlement";
import {
  CLOSE_ORDER_KEY,
  LIFECYCLE_ID,
  OPEN_ORDER_KEY,
  USD,
  ETH,
  USDC,
  USDC_UNIT,
  WETH,
  anchorCloseRow,
  anchorOpenRow,
  buildDecreaseRow,
  buildIncreaseRow,
  buildLifecycleData,
} from "./settlementMocks";

i18n.load({ en: {} });
i18n.activate("en");

const NBSP = " ";
const HAIR = " ";

const DEPOSIT_ORDER_KEY = "0x3333333333333333333333333333333333333333333333333333333333333333";
const PARTIAL_ORDER_KEY = "0x4444444444444444444444444444444444444444444444444444444444444444";
const SWAP_MARKET = "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336";

const openRow = buildIncreaseRow({
  id: "0xaa:1",
  orderKey: OPEN_ORDER_KEY,
  sizeDeltaUsd: 10_000n * USD,
  positionSizeInUsd: 10_000n * USD,
  initialCollateralDeltaAmount: 995n * USDC_UNIT,
  positionFeeAmount: 5n * USDC_UNIT,
} as unknown as Partial<PositionTradeAction> & { id: string });

const depositRow = buildIncreaseRow({
  id: "0xbb:1",
  orderKey: DEPOSIT_ORDER_KEY,
  sizeDeltaUsd: 0n,
  positionSizeInUsd: 10_000n * USD,
  initialCollateralDeltaAmount: 500n * USDC_UNIT,
} as unknown as Partial<PositionTradeAction> & { id: string });

const partialCloseRow = buildDecreaseRow({
  id: "0xcc:1",
  orderKey: PARTIAL_ORDER_KEY,
  sizeDeltaUsd: 4_000n * USD,
  positionSizeInUsd: 6_000n * USD,
  initialCollateralDeltaAmount: 200n * USDC_UNIT,
  basePnlUsd: 100n * USD,
  positionFeeAmount: 2n * USDC_UNIT,
} as unknown as Partial<PositionTradeAction> & { id: string });

const finalCloseRow = buildDecreaseRow({
  id: "0xdd:1",
  orderKey: CLOSE_ORDER_KEY,
  sizeDeltaUsd: 6_000n * USD,
  positionSizeInUsd: 0n,
  initialCollateralDeltaAmount: 1_100n * USDC_UNIT,
  basePnlUsd: -80n * USD,
  positionFeeAmount: 20n * USDC_UNIT,
} as unknown as Partial<PositionTradeAction> & { id: string });

const EXTENDED_ROWS = [openRow, depositRow, partialCloseRow, finalCloseRow];
const EXTENDED_REQUESTED = {
  [OPEN_ORDER_KEY]: { amount: 1_000n * USDC_UNIT },
  [DEPOSIT_ORDER_KEY]: { amount: 500n * USDC_UNIT },
};

function buildExtendedData(overrides: Partial<Parameters<typeof buildLifecycleData>[0]> = {}) {
  return buildLifecycleData({ rows: EXTENDED_ROWS, requestedByOrderKey: EXTENDED_REQUESTED, ...overrides });
}

function getExtendedAggregate(data = buildExtendedData(), closeRow: PositionTradeAction = finalCloseRow) {
  const view = getLifecycleSettlementView(closeRow, data);

  if (view.mode !== "extended") {
    throw new Error(`expected extended mode, got ${view.mode}`);
  }

  return view.aggregate;
}

function toLongDecreaseRow(row: PositionTradeAction, overrides: Partial<PositionTradeAction>): PositionTradeAction {
  return buildDecreaseRow({ ...row, isLong: true, ...overrides } as unknown as Partial<PositionTradeAction> & {
    id: string;
  });
}

describe("getLifecycleSettlementView", () => {
  it("keeps the compact settlement for a direct open-to-close lifecycle", () => {
    const view = getLifecycleSettlementView(
      anchorCloseRow,
      buildLifecycleData({
        rows: [anchorOpenRow, anchorCloseRow],
        requestedByOrderKey: { [OPEN_ORDER_KEY]: { amount: 1_000n * USDC_UNIT } },
      })
    );

    expect(view).toEqual({ mode: "compact", openRow: anchorOpenRow, isMultichain: false });
  });

  it("falls back when collateral left the position between the only two rows", () => {
    const drainedCloseRow = {
      ...anchorCloseRow,
      initialCollateralDeltaAmount: anchorCloseRow.initialCollateralDeltaAmount - 1_000_000n,
    } as PositionTradeAction;

    const view = getLifecycleSettlementView(
      drainedCloseRow,
      buildLifecycleData({
        rows: [anchorOpenRow, drainedCloseRow],
        requestedByOrderKey: { [OPEN_ORDER_KEY]: { amount: 1_000n * USDC_UNIT } },
      })
    );

    expect(view.mode).toBe("extended");
  });

  it("counts every margin deposit once and never uses the executed net-of-fees amount", () => {
    const aggregate = getExtendedAggregate();

    expect(aggregate.funded.legs).toEqual([{ token: USDC, amount: 1_500n * USDC_UNIT }]);
    expect(aggregate.funded.usd).toBe(1_500n * USD);
  });

  it("sums payouts of partial closes into the received-before-close total", () => {
    const aggregate = getExtendedAggregate();

    expect(aggregate.receivedBeforeClose.legs).toEqual([{ token: USDC, amount: 298n * USDC_UNIT }]);
    expect(aggregate.receivedAtClose.legs).toEqual([{ token: USDC, amount: 1_000n * USDC_UNIT }]);
    expect(aggregate.totalReceived.legs).toEqual([{ token: USDC, amount: 1_298n * USDC_UNIT }]);
    expect(aggregate.netResult.legs).toEqual([{ token: USDC, amount: -202n * USDC_UNIT }]);
    expect(aggregate.netResult.usd).toBe(-202n * USD);
  });

  it("reports lifecycle RPNL and net fees across every executed row", () => {
    const aggregate = getExtendedAggregate();

    expect(aggregate.lifecycleRpnlUsd).toBe(20n * USD);
    expect(aggregate.netFeesUsd).toBe(-27n * USD);
  });

  it("renders the same-token lifecycle block", () => {
    const result = getLifecycleSettlementLines(getExtendedAggregate()).filter((line) => line !== undefined);

    expect(result).toEqual([
      "",
      "Lifecycle settlement",
      "",
      { key: "Total margin funded", value: `~1,500.00${NBSP}USDC` },
      { key: "Wallet received before close", value: `~298.00${NBSP}USDC` },
      { key: "Wallet received at close", value: `~1,000.00${NBSP}USDC` },
      { key: "Total wallet received", value: `~1,298.00${NBSP}USDC` },
      { key: "Net wallet result", value: `~-202.00${NBSP}USDC` },
      "",
      { key: "Lifecycle RPNL", value: { text: `+$${HAIR}20.00`, state: "success" } },
      { key: "Net lifecycle fees / impact", value: { text: `-$${HAIR}27.00`, state: "error" } },
      "",
      { text: "Excludes claimed funding, price impact rebates and execution fees.", state: "muted" },
    ]);
  });

  it("includes the liquidation fee and clamps a wiped-out close to zero", () => {
    const liquidationRow = buildDecreaseRow({
      id: "0xee:1",
      orderType: OrderType.Liquidation,
      orderKey: CLOSE_ORDER_KEY,
      sizeDeltaUsd: 6_000n * USD,
      positionSizeInUsd: 0n,
      initialCollateralDeltaAmount: 300n * USDC_UNIT,
      basePnlUsd: -400n * USD,
      positionFeeAmount: 3n * USDC_UNIT,
      liquidationFeeAmount: 2n * USDC_UNIT,
    } as unknown as Partial<PositionTradeAction> & { id: string });

    const aggregate = getExtendedAggregate(
      buildLifecycleData({
        rows: [openRow, depositRow, partialCloseRow, liquidationRow],
        requestedByOrderKey: EXTENDED_REQUESTED,
      }),
      liquidationRow
    );

    expect(aggregate.receivedAtClose.usd).toBe(0n);
    expect(aggregate.receivedAtClose.legs).toEqual([{ token: USDC, amount: 0n }]);
    // 5 open + 2 partial + 3 close + 2 liquidation
    expect(aggregate.netFeesUsd).toBe(-12n * USD);
  });

  it("keeps token legs separate and marks the combined USD when the funding token was swapped", () => {
    const swappedOpenRow = buildIncreaseRow({
      id: "0xaa:1",
      orderKey: OPEN_ORDER_KEY,
      swapPath: [SWAP_MARKET],
      initialCollateralToken: WETH,
      sizeDeltaUsd: 10_000n * USD,
      positionSizeInUsd: 10_000n * USD,
      initialCollateralDeltaAmount: 995n * USDC_UNIT,
      positionFeeAmount: 5n * USDC_UNIT,
      // The indexer prices the position's collateral token; the transformer scales it by the funding token's decimals.
      collateralTokenPriceMin: 10n ** 24n * 10n ** 18n,
    } as unknown as Partial<PositionTradeAction> & { id: string });

    const aggregate = getExtendedAggregate(
      buildLifecycleData({
        rows: [swappedOpenRow, depositRow, partialCloseRow, finalCloseRow],
        requestedByOrderKey: {
          [OPEN_ORDER_KEY]: { amount: 10n ** 18n, tokenAddress: WETH.address, swapPath: [SWAP_MARKET] },
          [DEPOSIT_ORDER_KEY]: { amount: 500n * USDC_UNIT },
        },
        swapLegs: [
          {
            orderKey: OPEN_ORDER_KEY,
            marketAddress: SWAP_MARKET,
            tokenInAddress: WETH.address,
            tokenOutAddress: USDC.address,
            // 1 WETH = $2,000 in the contract price convention (price * 10^decimals = 1e30 USD).
            tokenInPrice: 2_000n * 10n ** 12n,
            tokenOutPrice: 10n ** 24n,
            amountIn: 10n ** 18n,
            amountOut: 1_000n * USDC_UNIT,
          },
        ],
      })
    );

    expect(aggregate.tier).toBe("tokenLegs");
    expect(aggregate.funded.legs).toEqual([
      { token: WETH, amount: 10n ** 18n },
      { token: USDC, amount: 500n * USDC_UNIT },
    ]);
    expect(aggregate.funded.usd).toBe(2_500n * USD);

    const lines = getLifecycleSettlementLines(aggregate);

    expect(lines[3]).toEqual({
      key: "Total margin funded",
      value: [`~1.0000${NBSP}WETH`, " + ", `~500.00${NBSP}USDC`, " ", { text: `(~$${HAIR}2,500.00)`, state: "muted" }],
    });
  });

  it.each([
    [DecreasePositionSwapType.NoSwap, "usdOnly"],
    [DecreasePositionSwapType.SwapCollateralTokenToPnlToken, "usdOnly"],
    [DecreasePositionSwapType.SwapPnlTokenToCollateralToken, "sameToken"],
  ])("resolves the payout tier for a profitable long close with swap type %i", (decreasePositionSwapType, tier) => {
    const longPartialRow = toLongDecreaseRow(partialCloseRow, { decreasePositionSwapType });
    const longCloseRow = toLongDecreaseRow(finalCloseRow, { basePnlUsd: 80n * USD, decreasePositionSwapType });

    const aggregate = getExtendedAggregate(
      buildLifecycleData({
        rows: [openRow, depositRow, longPartialRow, longCloseRow],
        requestedByOrderKey: EXTENDED_REQUESTED,
      }),
      longCloseRow
    );

    expect(aggregate.tier).toBe(tier);

    if (tier === "usdOnly") {
      expect(getLifecycleSettlementLines(aggregate)[3]).toEqual({
        key: "Total margin funded",
        value: `~$${HAIR}1,500.00`,
      });
    }
  });

  it("labels cashflows as GMX balance movements for multichain lifecycles", () => {
    const aggregate = getExtendedAggregate(
      buildLifecycleData({
        rows: [{ ...openRow, srcChainId: 8453 } as PositionTradeAction, depositRow, partialCloseRow, finalCloseRow],
        requestedByOrderKey: EXTENDED_REQUESTED,
      })
    );

    expect(aggregate.isMultichain).toBe(true);

    const result = getLifecycleSettlementLines(aggregate).filter((line) => line !== undefined);

    expect(result.filter((line) => typeof line === "object" && line !== null && "key" in line)).toEqual([
      { key: "Total margin funded (GMX balance)", value: `~1,500.00${NBSP}USDC` },
      { key: "Received before close (GMX balance)", value: `~298.00${NBSP}USDC` },
      { key: "Received at close (GMX balance)", value: `~1,000.00${NBSP}USDC` },
      { key: "Total received (GMX balance)", value: `~1,298.00${NBSP}USDC` },
      { key: "Net result (GMX balance)", value: `~-202.00${NBSP}USDC` },
      { key: "Lifecycle RPNL", value: { text: `+$${HAIR}20.00`, state: "success" } },
      { key: "Net lifecycle fees / impact", value: { text: `-$${HAIR}27.00`, state: "error" } },
    ]);
    expect(result.at(-1)).toEqual({
      text: "This position was funded from your GMX multichain balance; amounts are balance movements, not wallet transfers.",
      state: "muted",
    });
  });

  it.each([
    ["a settle-funding execution is in the window", buildExtendedData({ hasFundingSettlement: true })],
    ["the lifecycle exceeded the pagination cap", buildExtendedData({ isTruncated: true })],
    ["no lifecycle rows were indexed", buildLifecycleData({ rows: [] })],
    [
      "the opening row is not the lifecycle's opening order",
      buildLifecycleData({
        rows: [{ ...openRow, orderKey: PARTIAL_ORDER_KEY } as PositionTradeAction, ...EXTENDED_ROWS.slice(1)],
        requestedByOrderKey: { ...EXTENDED_REQUESTED, [PARTIAL_ORDER_KEY]: { amount: 1_000n * USDC_UNIT } },
      }),
    ],
    [
      "the size chain does not add up",
      buildLifecycleData({
        rows: [
          openRow,
          depositRow,
          { ...partialCloseRow, positionSizeInUsd: 5_000n * USD } as PositionTradeAction,
          finalCloseRow,
        ],
        requestedByOrderKey: EXTENDED_REQUESTED,
      }),
    ],
    [
      "an increase order could not be matched",
      buildLifecycleData({ rows: EXTENDED_ROWS, requestedByOrderKey: { [OPEN_ORDER_KEY]: { amount: 1n } } }),
    ],
    [
      "the clicked row is not the last lifecycle row",
      buildLifecycleData({
        rows: [...EXTENDED_ROWS, { ...openRow, id: "0xff:1" } as PositionTradeAction],
        requestedByOrderKey: EXTENDED_REQUESTED,
      }),
    ],
  ])("falls back to the close side when %s", (_label, data) => {
    expect(getLifecycleSettlementView(finalCloseRow, data).mode).toBe("closeSideOnly");
  });

  it("falls back when the lifecycle id is missing", () => {
    const unmatchedCloseRow = { ...finalCloseRow, positionLifecycleId: undefined } as PositionTradeAction;

    expect(getLifecycleSettlementView(unmatchedCloseRow, buildExtendedData()).mode).toBe("closeSideOnly");
  });

  it("nets a native payout against margin funded in the wrapped token", () => {
    const wethFundedOpen = buildIncreaseRow({
      id: "0xaa:1",
      orderKey: OPEN_ORDER_KEY,
      swapPath: [SWAP_MARKET],
      initialCollateralToken: WETH,
      sizeDeltaUsd: 10_000n * USD,
      positionSizeInUsd: 10_000n * USD,
      initialCollateralDeltaAmount: 995n * USDC_UNIT,
      collateralTokenPriceMin: 10n ** 24n * 10n ** 18n,
    } as unknown as Partial<PositionTradeAction> & { id: string });

    const ethPayoutClose = buildDecreaseRow({
      id: "0xdd:1",
      orderKey: CLOSE_ORDER_KEY,
      swapPath: [SWAP_MARKET],
      targetCollateralToken: ETH,
      sizeDeltaUsd: 10_000n * USD,
      positionSizeInUsd: 0n,
      initialCollateralDeltaAmount: 1_000n * USDC_UNIT,
    } as unknown as Partial<PositionTradeAction> & { id: string });

    const swapLeg = {
      orderKey: OPEN_ORDER_KEY,
      marketAddress: SWAP_MARKET,
      tokenInAddress: WETH.address,
      tokenOutAddress: USDC.address,
      tokenInPrice: 2_000n * 10n ** 12n,
      tokenOutPrice: 10n ** 24n,
      amountIn: 10n ** 18n,
      amountOut: 1_000n * USDC_UNIT,
    };

    const aggregate = getExtendedAggregate(
      buildLifecycleData({
        rows: [wethFundedOpen, ethPayoutClose],
        requestedByOrderKey: { [OPEN_ORDER_KEY]: { amount: 10n ** 18n, tokenAddress: WETH.address } },
        swapLegs: [swapLeg, { ...swapLeg, orderKey: CLOSE_ORDER_KEY, amountOut: 6n * 10n ** 17n }],
      }),
      ethPayoutClose
    );

    expect(aggregate.netResult.legs).toHaveLength(1);
    expect(aggregate.netResult.legs[0].amount).toBe(-4n * 10n ** 17n);
  });

  it("labels an unreconcilable multichain lifecycle as a balance movement", () => {
    const view = getLifecycleSettlementView(
      finalCloseRow,
      buildExtendedData({
        rows: [{ ...openRow, srcChainId: 8453 } as PositionTradeAction, depositRow, partialCloseRow, finalCloseRow],
        hasFundingSettlement: true,
      })
    );

    expect(view).toEqual({ mode: "closeSideOnly", isMultichain: true });
  });

  it("excludes a later reopen of the same position slot", () => {
    const reopenRow = buildIncreaseRow({
      id: "0xff:1",
      orderKey: "0x5555555555555555555555555555555555555555555555555555555555555555",
      positionLifecycleId: `${LIFECYCLE_ID}-reopen`,
      sizeDeltaUsd: 3_000n * USD,
      positionSizeInUsd: 3_000n * USD,
      initialCollateralDeltaAmount: 400n * USDC_UNIT,
    } as unknown as Partial<PositionTradeAction> & { id: string });

    const view = getLifecycleSettlementView(
      finalCloseRow,
      buildLifecycleData({
        rows: [...EXTENDED_ROWS, reopenRow],
        requestedByOrderKey: EXTENDED_REQUESTED,
      })
    );

    expect(view.mode).toBe("closeSideOnly");
    expect(getExtendedAggregate().funded.legs).toEqual([{ token: USDC, amount: 1_500n * USDC_UNIT }]);
  });
});
