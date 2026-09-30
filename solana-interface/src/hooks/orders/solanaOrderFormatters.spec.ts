import { describe, expect, it } from "vitest";

import { toSolanaOrderViewModel } from "./solanaOrderAdapter";
import { SOLANA_ORDER_KIND as K } from "./solanaOrderConstants";
import {
  formatBigintDivision,
  formatSolanaAcceptablePrice,
  formatSolanaCollateralSwapNote,
  formatSolanaMarkPrice,
  formatSolanaOrderExecutionText,
  formatSolanaOrderMargin,
  formatSolanaOrderPrice,
  formatSolanaOrderSize,
  formatSolanaSwapReceiveText,
  formatSolanaTriggerPrice,
  getSolanaCollateralDeltaLabel,
  SOLANA_ORDER_DASH,
  SOLANA_ORDER_UNAVAILABLE,
} from "./solanaOrderFormatters";
import type { RawSolanaOrder } from "./types";
import type { SolanaMarketInfo, SolanaTicker } from "../../markets/solanaMarketSocketStore";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const WSOL = "So11111111111111111111111111111111111111112";
const SOL_INDEX = "So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH";
const MARKET = "MarketTokenAddress11111111111111111111111111";
const ONE_USD = 10n ** 20n;
const solMarket: SolanaMarketInfo = { marketToken: MARKET, indexToken: SOL_INDEX, longToken: WSOL, shortToken: USDC, supply: "1" };
// Unit prices are per smallest unit: 150 USD / 1e9 lamports, 1 USD / 1e6 USDC units.
const SOL_UNIT = (150n * ONE_USD) / 10n ** 9n;
const USDC_UNIT = ONE_USD / 10n ** 6n;
const prices = new Map<string, SolanaTicker>([
  [SOL_INDEX, { symbol: "SOL", price: 150n * ONE_USD, unitPrice: SOL_UNIT, minUnitPrice: 1n, maxUnitPrice: 1n }],
  [WSOL, { symbol: "SOL", price: 150n * ONE_USD, unitPrice: SOL_UNIT, minUnitPrice: 1n, maxUnitPrice: 1n }],
  [USDC, { symbol: "USDC", price: ONE_USD, unitPrice: USDC_UNIT, minUnitPrice: 1n, maxUnitPrice: 1n }],
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
    // GMX prefixes the acceptable price with the trigger threshold
    expect(formatSolanaAcceptablePrice(long)).toBe("< $ 141.000");
    expect(getSolanaCollateralDeltaLabel(long)).toBe("Margin");
    expect(formatSolanaOrderMargin(long)).toBe("5.00\u00a0USDC");
    expect(formatSolanaCollateralSwapNote(long)).toBeUndefined();
    expect(formatSolanaOrderExecutionText(long)).toBe("Executes when oracle price is < $ 140.000");

    const decrease = vm({ kind: K.LimitDecrease, isLong: false });
    expect(formatSolanaOrderSize(decrease)).toBe("-$ 100.00");
    expect(formatSolanaTriggerPrice(decrease)).toBe("< $ 140.000");
    if (decrease.category !== "position") throw new Error("expected position order");
    expect(getSolanaCollateralDeltaLabel(decrease)).toBe("Margin delta");
    expect(formatSolanaOrderMargin(decrease)).toBe("-5.00\u00a0USDC");
  });

  it("shows the full close and the live position margin when the order closes the whole position", () => {
    const decrease = vm({ kind: K.LimitDecrease });
    if (decrease.category !== "position") throw new Error("expected position order");
    const full = { ...decrease, isFullClose: true, positionCollateralAmount: 42_000_000n };
    expect(formatSolanaOrderSize(full)).toBe("Full position close");
    expect(formatSolanaOrderMargin(full)).toBe("-42.00\u00a0USDC");
    // full close without the linked position margin falls back to the order amount
    expect(formatSolanaOrderMargin({ ...full, positionCollateralAmount: undefined })).toBe("-5.00\u00a0USDC");
  });

  it("converts the pay token to the position collateral and explains the swap on execution", () => {
    // pay 300 USDC into a wSOL-collateral position at 150 USD per SOL → 2 SOL
    const swapped = vm({ initialCollateralToken: USDC, collateralToken: WSOL, initialCollateralDeltaAmount: 300_000_000n });
    if (swapped.category !== "position") throw new Error("expected position order");
    expect(formatSolanaOrderMargin(swapped)).toBe("2.0000\u00a0SOL");
    expect(formatSolanaCollateralSwapNote(swapped)).toBe("300.00\u00a0USDC swapped to SOL when executed");

    const noPrices = toSolanaOrderViewModel(
      raw({ initialCollateralToken: USDC, collateralToken: WSOL, initialCollateralDeltaAmount: 300_000_000n }),
      { marketInfo: solMarket, tokenPriceByMint: new Map() }
    );
    if (noPrices.category !== "position") throw new Error("expected position order");
    expect(formatSolanaOrderMargin(noPrices)).toBe(SOLANA_ORDER_UNAVAILABLE);
  });

  it("shows N/A for the stop-loss acceptable price and for market order trigger prices", () => {
    const stopLoss = vm({ kind: K.StopLossDecrease });
    if (stopLoss.category !== "position") throw new Error("expected position order");
    expect(formatSolanaAcceptablePrice(stopLoss)).toBe("N/A");

    const market = vm({ kind: K.MarketIncrease });
    expect(formatSolanaTriggerPrice(market)).toBe("N/A");
    expect(formatSolanaMarkPrice(market)).toBe("$ 150.000");
    if (market.category !== "position") throw new Error("expected position order");
    // market orders have no trigger threshold: bare acceptable price
    expect(formatSolanaAcceptablePrice(market)).toBe("$ 141.000");
    expect(formatSolanaOrderMargin(market)).toBe("5.00\u00a0USDC");
  });

  it("shows dashes or the tooltip fallback when prices are unknown", () => {
    const noMarket = vm({}, null);
    expect(formatSolanaTriggerPrice(noMarket)).toBe(`< ${SOLANA_ORDER_DASH}`);
    expect(formatSolanaMarkPrice(noMarket)).toBe(SOLANA_ORDER_DASH);
    if (noMarket.category !== "position") throw new Error("expected position order");
    expect(formatSolanaAcceptablePrice(noMarket)).toBe(SOLANA_ORDER_UNAVAILABLE);
  });
});

describe("collateral orders", () => {
  it("shows $0, N/A and a signed margin delta", () => {
    const deposit = vm({ kind: K.MarketIncrease, sizeDeltaUsd: 0n });
    expect(formatSolanaOrderSize(deposit)).toBe("$0");
    expect(formatSolanaTriggerPrice(deposit)).toBe("N/A");
    expect(formatSolanaMarkPrice(deposit)).toBe(SOLANA_ORDER_DASH);
    if (deposit.category !== "collateral") throw new Error("expected collateral order");
    expect(getSolanaCollateralDeltaLabel(deposit)).toBe("Margin");
    expect(formatSolanaOrderMargin(deposit)).toBe("5.00\u00a0USDC");

    const withdraw = vm({ kind: K.MarketDecrease, sizeDeltaUsd: 0n });
    if (withdraw.category !== "collateral") throw new Error("expected collateral order");
    expect(getSolanaCollateralDeltaLabel(withdraw)).toBe("Margin delta");
    expect(formatSolanaOrderMargin(withdraw)).toBe("-5.00\u00a0USDC");
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
    if (swap.category !== "swap") throw new Error("expected swap order");
    expect(formatSolanaSwapReceiveText(swap)).toBe(
      "Receive at least 2.0000\u00a0SOL if executed. Price updates based on fees and price impact."
    );
  });
});
