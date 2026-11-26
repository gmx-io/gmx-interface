import { describe, expect, it } from "vitest";

import { GMSOL_MARKETS } from "config/gmsol/markets";
import { GMSOL_TOKENS } from "config/gmsol/tokens";
import type { SidecarOrderEntry } from "domain/synthetics/sidecarOrders/types";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import type { MarketInfo } from "sdk/utils/markets/types";
import { DecreasePositionSwapType, OrderType } from "sdk/utils/orders/types";
import type { TokenData } from "sdk/utils/tokens/types";
import { TradeMode, type DecreasePositionAmounts, type IncreasePositionAmounts } from "sdk/utils/trade/types";

import {
  buildGmsolTradeboxOrderAction,
  buildGmsolTradeboxTriggerAction,
  GmsolTradeboxError,
} from "./buildTradeboxOrderAction";

const usd = 10n ** 30n;
const market = GMSOL_MARKETS[0];
const indexToken = GMSOL_TOKENS.find((token) => token.address === market.indexTokenAddress)!;
const collateralToken: TokenData = {
  ...GMSOL_TOKENS.find((token) => token.address === market.longTokenAddress)!,
  prices: { minPrice: usd, maxPrice: usd },
};
const marketInfo = { ...market, tradeMath: "gmsol", isDisabled: false, indexToken } as unknown as MarketInfo;
const amounts = {
  initialCollateralAmount: 10_000_000n,
  collateralDeltaAmount: 9_950_000n,
  sizeDeltaUsd: 100n * usd,
  acceptablePrice: 2_000n * usd,
  triggerPrice: 1_950n * usd,
  limitOrderType: OrderType.LimitIncrease,
  swapStrategy: { type: "noSwap" },
} as IncreasePositionAmounts;
const decrease = {
  sizeDeltaUsd: 50n * usd,
  collateralDeltaAmount: 4_900_000n,
  acceptablePrice: 2_090n * usd,
  triggerPrice: 2_100n * usd,
  triggerOrderType: OrderType.LimitDecrease,
  decreaseSwapType: DecreasePositionSwapType.NoSwap,
} as DecreasePositionAmounts;
const entry = {
  txnType: "create",
  decreaseAmounts: decrease,
  price: { error: null },
  sizeUsd: { error: null },
  percentage: { error: null },
} as SidecarOrderEntry;
const sized = (sizeDeltaUsd: bigint) =>
  ({ ...entry, decreaseAmounts: { ...decrease, sizeDeltaUsd } }) as SidecarOrderEntry;
const input = {
  marketInfo,
  fromToken: collateralToken,
  collateralToken,
  amounts,
  tradeMode: TradeMode.Market,
  isLong: true,
  sidecarEntries: [] as SidecarOrderEntry[],
  allowedSlippage: 50,
  existingPositionSizeUsd: undefined as bigint | undefined,
};

describe("shared Solana order intent", () => {
  it("preserves payment, directional slippage and partial TP/SL collateral across market and limit requests", () => {
    for (const isLong of [true, false]) {
      for (const tradeMode of [TradeMode.Market, TradeMode.Limit]) {
        const isMarket = tradeMode === TradeMode.Market;
        const sidecarEntries = isMarket ? [entry] : [];
        const result = buildGmsolTradeboxOrderAction({ ...input, isLong, tradeMode, sidecarEntries });
        if (result.type !== "create") throw new Error("Expected create");
        expect(result.atomic).toBe(isMarket);
        expect(result.orders[0]).toMatchObject({
          kind: isMarket ? "MarketIncrease" : "LimitIncrease",
          collateralDeltaAmount: 10_000_000n,
          acceptablePrice: isMarket ? (isLong ? 2_010n : 1_990n) * usd : 2_000n * usd,
          triggerPrice: isMarket ? undefined : 1_950n * usd,
        });
        expect(result.orders.slice(1)).toMatchObject(
          sidecarEntries.map(() => ({
            kind: "LimitDecrease",
            collateralDeltaAmount: 4_900_000n,
            sizeDeltaUsd: 50n * usd,
            acceptablePrice: 2_090n * usd,
            triggerPrice: 2_100n * usd,
            decreaseSwapType: "NoSwap",
            payWithNativeSol: false,
          }))
        );
      }
    }
    for (const triggerOrderType of [OrderType.LimitDecrease, OrderType.StopLossDecrease] as const) {
      const result = buildGmsolTradeboxTriggerAction({
        marketInfo,
        collateralToken,
        amounts: { ...decrease, triggerOrderType },
        isLong: true,
      });
      if (result.type !== "create") throw new Error("Expected create");
      expect(result.orders[0].collateralDeltaAmount).toBe(4_900_000n);
      expect(result.orders[0].kind).toBe(
        triggerOrderType === OrderType.LimitDecrease ? "LimitDecrease" : "StopLossDecrease"
      );
    }
  });

  it("rejects unsupported intent instead of dropping routes, edits, or unvalidated math", () => {
    for (const patch of [
      { marketInfo: { ...marketInfo, tradeMath: undefined } },
      { tradeMode: TradeMode.StopMarket },
      { fromToken: { ...collateralToken, address: "different-pay-token" } },
      { amounts: { ...amounts, swapStrategy: { type: "internalSwap" } } },
      { sidecarEntries: [entry, entry] },
      { sidecarEntries: [sized(101n * usd)] },
      { existingPositionSizeUsd: 1_000n * usd, sidecarEntries: [sized(1_101n * usd)] },
      { tradeMode: TradeMode.Limit, sidecarEntries: [entry] },
      { sidecarEntries: [{ ...entry, price: { value: 2_100n * usd, error: null }, decreaseAmounts: undefined }] },
    ])
      expect(() => buildGmsolTradeboxOrderAction({ ...input, ...patch } as typeof input)).toThrow(GmsolTradeboxError);
    const edited = { ...input, sidecarEntries: [{ ...entry, txnType: "update" }] as SidecarOrderEntry[] };
    expect(() => buildGmsolTradeboxOrderAction(edited)).toThrow(expect.objectContaining({ code: "tpslEdit" }));
    const cleared = { ...entry, price: { value: null, error: null }, decreaseAmounts: undefined } as SidecarOrderEntry;
    expect(buildGmsolTradeboxOrderAction({ ...input, sidecarEntries: [cleared, entry] })).toMatchObject({
      orders: [{ kind: "MarketIncrease" }, { kind: "LimitDecrease" }],
    });
    const increased = { ...input, existingPositionSizeUsd: 1_000n * usd, sidecarEntries: [sized(1_100n * usd)] };
    expect(buildGmsolTradeboxOrderAction(increased)).toMatchObject({
      atomic: true,
      existingPositionSizeUsd: 1_000n * usd,
    });
    const solMarket = GMSOL_MARKETS.find(
      (item) => item.longTokenAddress === "So11111111111111111111111111111111111111112"
    )!;
    const wsol: TokenData = {
      ...GMSOL_TOKENS.find((token) => token.address === solMarket.longTokenAddress)!,
      prices: { minPrice: 100n * usd, maxPrice: 100n * usd },
    };
    const native = { ...wsol, address: NATIVE_TOKEN_ADDRESS, isNative: true, wrappedAddress: wsol.address };
    const result = buildGmsolTradeboxOrderAction({
      ...input,
      marketInfo: { ...marketInfo, ...solMarket },
      collateralToken: wsol,
      fromToken: native,
      sidecarEntries: [entry],
    });
    if (result.type !== "create") throw new Error("Expected create");
    expect(result.orders[0]).toMatchObject({ payWithNativeSol: true, payToken: wsol.address, unwrapNative: true });
    expect(result.orders[1]).toMatchObject({ payWithNativeSol: false, payToken: undefined, unwrapNative: false });
  });
});
