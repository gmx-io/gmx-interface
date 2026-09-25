import { describe, expect, it } from "vitest";

import { toSolanaOrderViewModel } from "./solanaOrderAdapter";
import { SOLANA_ORDER_KIND as K } from "./solanaOrderConstants";
import {
  formatBigintDivision,
  formatSolanaAcceptablePrice,
  formatSolanaCollateralDelta,
  formatSolanaMarkPrice,
  formatSolanaOrderPrice,
  formatSolanaOrderSize,
  formatSolanaTriggerPrice,
  SOLANA_ORDER_DASH,
} from "./solanaOrderFormatters";
import type { RawSolanaOrder } from "./types";
import type { SolanaMarketInfo, SolanaTicker } from "../../markets/solanaMarketSocketStore";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const WSOL = "So11111111111111111111111111111111111111112";
const SOL_INDEX = "So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH";
const MARKET = "MarketTokenAddress11111111111111111111111111";
const ONE_USD = 10n ** 20n;
const solMarket: SolanaMarketInfo = { marketToken: MARKET, indexToken: SOL_INDEX, longToken: WSOL, shortToken: USDC, supply: "1" };
const prices = new Map<string, SolanaTicker>([
  [SOL_INDEX, { symbol: "SOL", price: 150n * ONE_USD, minUnitPrice: 1n, maxUnitPrice: 1n }],
  [WSOL, { symbol: "SOL", price: 150n * ONE_USD, minUnitPrice: 1n, maxUnitPrice: 1n }],
  [USDC, { symbol: "USDC", price: ONE_USD, minUnitPrice: 1n, maxUnitPrice: 1n }],
]);

function raw(overrides: Partial<RawSolanaOrder>): RawSolanaOrder {
  return {
    pubkey: "orderPubkey",
    slot: 1,
    owner: "owner",
    store: "store",
    marketToken: MARKET,
    actionState: 0,
    kind: K.LimitIncrease,
    isLong: true,
    initialCollateralToken: USDC,
    collateralToken: USDC,
    longToken: WSOL,
    shortToken: USDC,
    sizeDeltaUsd: 100n * ONE_USD,
    initialCollateralDeltaAmount: 5_000_000n,
    triggerPrice: (140n * ONE_USD) / 10n ** 9n,
    acceptablePrice: (141n * ONE_USD) / 10n ** 9n,
    minOutputAmount: 0n,
    primarySwapPath: [],
    updatedAt: 1n,
    updatedAtSlot: 1n,
    ...overrides,
  };
}

const vm = (overrides: Partial<RawSolanaOrder>, marketInfo: SolanaMarketInfo | null = solMarket) =>
  toSolanaOrderViewModel(raw(overrides), { marketInfo: marketInfo ?? undefined, tokenPriceByMint: prices });

describe("formatBigintDivision", () => {
  it("truncates to the requested decimals", () => {
    expect(formatBigintDivision(300n, 2n)).toBe("150.000");
    expect(formatBigintDivision(10n, 3n)).toBe("3.333");
    expect(formatBigintDivision(1n, 0n)).toBe(SOLANA_ORDER_DASH);
  });
});

describe("formatSolanaOrderPrice", () => {
  it("uses 5 decimals for forex markets and the GMX price decimals otherwise", () => {
    const price = 10852n * 10n ** 26n; // 1.0852
    expect(formatSolanaOrderPrice(price, true)).toBe("$ 1.08520");
    expect(formatSolanaOrderPrice(150n * 10n ** 30n, false)).toBe("$ 150.000");
    expect(formatSolanaOrderPrice(undefined, false)).toBe(SOLANA_ORDER_DASH);
  });
});

describe("position orders", () => {
  it("formats size with a sign, trigger with the threshold and the acceptable price", () => {
    const long = vm({});
    expect(formatSolanaOrderSize(long)).toBe("+$ 100.00");
    expect(formatSolanaTriggerPrice(long)).toBe("< $ 140.000");
    expect(formatSolanaMarkPrice(long)).toBe("$ 150.000");
    if (long.category !== "position") throw new Error("expected position order");
    expect(formatSolanaAcceptablePrice(long)).toBe("≤ $ 141.000");
    expect(formatSolanaCollateralDelta(long)).toBe("5.00000\u00a0USDC");

    const decrease = vm({ kind: K.LimitDecrease, isLong: false });
    expect(formatSolanaOrderSize(decrease)).toBe("-$ 100.00");
    expect(formatSolanaTriggerPrice(decrease)).toBe("< $ 140.000");
  });

  it("shows No limit for stop-loss and (Market) for market orders", () => {
    const stopLoss = vm({ kind: K.StopLossDecrease });
    if (stopLoss.category !== "position") throw new Error("expected position order");
    expect(formatSolanaAcceptablePrice(stopLoss)).toBe("No limit");

    const market = vm({ kind: K.MarketIncrease });
    expect(formatSolanaTriggerPrice(market)).toBe("(Market)");
    expect(formatSolanaMarkPrice(market)).toBe("$ 150.000");
    if (market.category !== "position") throw new Error("expected position order");
    expect(formatSolanaCollateralDelta(market)).toBe("+5.00000\u00a0USDC");
  });

  it("shows dashes when prices are unknown", () => {
    const noMarket = vm({}, null);
    expect(formatSolanaTriggerPrice(noMarket)).toBe(`< ${SOLANA_ORDER_DASH}`);
    expect(formatSolanaMarkPrice(noMarket)).toBe(SOLANA_ORDER_DASH);
    if (noMarket.category !== "position") throw new Error("expected position order");
    expect(formatSolanaAcceptablePrice(noMarket)).toBe(SOLANA_ORDER_DASH);
  });
});

describe("collateral orders", () => {
  it("shows $0, dashes and a signed collateral delta", () => {
    const deposit = vm({ kind: K.MarketIncrease, sizeDeltaUsd: 0n });
    expect(formatSolanaOrderSize(deposit)).toBe("$0");
    expect(formatSolanaTriggerPrice(deposit)).toBe(SOLANA_ORDER_DASH);
    expect(formatSolanaMarkPrice(deposit)).toBe(SOLANA_ORDER_DASH);
    if (deposit.category !== "collateral") throw new Error("expected collateral order");
    expect(formatSolanaCollateralDelta(deposit)).toBe("+5.00000\u00a0USDC");

    const withdraw = vm({ kind: K.MarketDecrease, sizeDeltaUsd: 0n });
    if (withdraw.category !== "collateral") throw new Error("expected collateral order");
    expect(formatSolanaCollateralDelta(withdraw)).toBe("-5.00000\u00a0USDC");
  });
});

describe("swap orders", () => {
  it("shows token amounts and exchange rates", () => {
    const swap = vm({
      kind: K.LimitSwap,
      initialCollateralToken: USDC,
      finalOutputToken: WSOL,
      initialCollateralDeltaAmount: 300_000_000n,
      minOutputAmount: 2_000_000_000n,
    });
    expect(formatSolanaOrderSize(swap)).toBe("300.0000\u00a0USDC");
    expect(formatSolanaTriggerPrice(swap)).toBe("150.000 USDC / SOL");
    expect(formatSolanaMarkPrice(swap)).toBe("150.000 USDC / SOL");
  });
});
