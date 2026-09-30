import { describe, expect, it } from "vitest";

import { convertSolanaTokenAmount, deriveSwapRatio, toSolanaOrderViewModel } from "./solanaOrderAdapter";
import { SOLANA_ORDER_KIND as K } from "./solanaOrderConstants";
import type { RawSolanaOrder } from "./types";
import type { SolanaMarketInfo, SolanaTicker } from "../../markets/solanaMarketSocketStore";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const WSOL = "So11111111111111111111111111111111111111112";
const SOL_INDEX = "So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH";
const EUR = "EurdPiuWJazzqJLKE4Amb1ZQxVkpwEiSKCZfNgXC9Wi4";
const MARKET = "MarketTokenAddress11111111111111111111111111";
const ONE_USD = 10n ** 20n;

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
    triggerPrice: 0n,
    acceptablePrice: 0n,
    minOutputAmount: 0n,
    primarySwapPath: [],
    updatedAt: 1_700_000_000n,
    updatedAtSlot: 1n,
    ...overrides,
  };
}

const solMarket: SolanaMarketInfo = { marketToken: MARKET, indexToken: SOL_INDEX, longToken: WSOL, shortToken: USDC, supply: "1" };
const NATIVE_SOL = "11111111111111111111111111111111";
const ticker = (symbol: string, price: bigint, unitPrice: bigint): SolanaTicker => ({
  symbol,
  price,
  unitPrice,
  minUnitPrice: 1n,
  maxUnitPrice: 1n,
});
const SOL_UNIT = (150n * ONE_USD) / 10n ** 9n;
const USDC_UNIT = ONE_USD / 10n ** 6n;
const prices = new Map<string, SolanaTicker>([
  [SOL_INDEX, ticker("SOL", 150n * ONE_USD, SOL_UNIT)],
  [WSOL, ticker("SOL", 150n * ONE_USD, SOL_UNIT)],
  [NATIVE_SOL, ticker("SOL", 150n * ONE_USD, SOL_UNIT)],
  [USDC, ticker("USDC", ONE_USD, USDC_UNIT)],
]);

describe("toSolanaOrderViewModel: position orders", () => {
  it("maps a long limit increase with 30-decimal USD and per-token prices", () => {
    // unit price 150 USD per SOL: 150e20 / 1e9 per lamport
    const order = raw({ triggerPrice: (150n * ONE_USD) / 10n ** 9n, acceptablePrice: (151n * ONE_USD) / 10n ** 9n });
    const vm = toSolanaOrderViewModel(order, { marketInfo: solMarket, tokenPriceByMint: prices });
    expect(vm.category).toBe("position");
    if (vm.category !== "position") return;
    expect(vm).toMatchObject({
      key: "orderPubkey",
      isLong: true,
      symbol: "SOL",
      displayMarketName: "SOL/USD",
      indexTokenAddress: SOL_INDEX,
      isForexPrecision: false,
      isIncrease: true,
      isMarketOrder: false,
      triggerThreshold: "<",
      acceptableComparator: "≤",
      noAcceptableLimit: false,
      isBoundaryAcceptablePrice: false,
      isFullClose: false,
      poolName: "WSOL-USDC",
      collateralSymbol: "USDC",
      collateralDecimals: 6,
      collateralIsStable: true,
      collateralDeltaAmount: 5_000_000n,
      targetCollateralSymbol: "USDC",
      targetCollateralDecimals: 6,
      targetCollateralIsStable: true,
      isCollateralSwap: false,
      targetCollateralDeltaAmount: 5_000_000n,
    });
    expect(vm.sizeDeltaUsd).toBe(100n * 10n ** 30n);
    expect(vm.triggerPrice).toBe(150n * 10n ** 30n);
    expect(vm.acceptablePrice).toBe(151n * 10n ** 30n);
    expect(vm.markPrice).toBe(150n * 10n ** 30n);
    expect(vm.typeLabel.message).toBe("Limit Increase");
  });

  it("maps a short stop-loss: negative size, no acceptable limit, zero prices become undefined", () => {
    const order = raw({ kind: K.StopLossDecrease, isLong: false, triggerPrice: 1n, acceptablePrice: 0n });
    const vm = toSolanaOrderViewModel(order, { marketInfo: solMarket, tokenPriceByMint: prices });
    if (vm.category !== "position") throw new Error("expected position order");
    expect(vm.sizeDeltaUsd).toBe(-100n * 10n ** 30n);
    expect(vm.triggerThreshold).toBe(">");
    expect(vm.noAcceptableLimit).toBe(true);
    expect(vm.acceptablePrice).toBeUndefined();
    expect(vm.isBoundaryAcceptablePrice).toBe(true);
    expect(vm.typeLabel.message).toBe("Stop-Loss");
  });

  it("detects a collateral swap and converts the pay amount into the target collateral token", () => {
    // 300 USDC into a wSOL position at 150 USD per SOL → 2 SOL
    const swapped = toSolanaOrderViewModel(
      raw({ initialCollateralToken: USDC, collateralToken: WSOL, initialCollateralDeltaAmount: 300_000_000n }),
      { marketInfo: solMarket, tokenPriceByMint: prices }
    );
    if (swapped.category !== "position") throw new Error("expected position order");
    expect(swapped.isCollateralSwap).toBe(true);
    expect(swapped.targetCollateralDeltaAmount).toBe(2_000_000_000n);
    expect(swapped.targetCollateralSymbol).toBe("SOL");
    expect(swapped.targetCollateralDecimals).toBe(9);
    expect(swapped.targetCollateralIsStable).toBe(false);

    // native SOL paid into a wSOL position is not a swap
    const native = toSolanaOrderViewModel(raw({ initialCollateralToken: NATIVE_SOL, collateralToken: WSOL }), {
      marketInfo: solMarket,
      tokenPriceByMint: prices,
    });
    if (native.category !== "position") throw new Error("expected position order");
    expect(native.isCollateralSwap).toBe(false);
    expect(native.targetCollateralDeltaAmount).toBe(5_000_000n);

    // without prices the converted amount is unknown, never zero
    const noPrices = toSolanaOrderViewModel(
      raw({ initialCollateralToken: USDC, collateralToken: WSOL, initialCollateralDeltaAmount: 300_000_000n }),
      { marketInfo: solMarket, tokenPriceByMint: new Map() }
    );
    if (noPrices.category !== "position") throw new Error("expected position order");
    expect(noPrices.targetCollateralDeltaAmount).toBeUndefined();
  });

  it("flags forex markets and falls back without market info", () => {
    const eurMarket: SolanaMarketInfo = { ...solMarket, indexToken: EUR };
    const vm = toSolanaOrderViewModel(raw({ triggerPrice: 5n }), { marketInfo: eurMarket, tokenPriceByMint: new Map() });
    if (vm.category !== "position") throw new Error("expected position order");
    expect(vm.isForexPrecision).toBe(true);
    expect(vm.displayMarketName).toBe("EUR/USD");
    expect(vm.markPrice).toBeUndefined();

    const noMarket = toSolanaOrderViewModel(raw({ triggerPrice: 5n }), { marketInfo: undefined, tokenPriceByMint: prices });
    if (noMarket.category !== "position") throw new Error("expected position order");
    expect(noMarket.symbol).toBe("Market…1111");
    expect(noMarket.triggerPrice).toBeUndefined();
    expect(noMarket.markPrice).toBeUndefined();
  });

  it("marks non-zero market orders as market orders", () => {
    const vm = toSolanaOrderViewModel(raw({ kind: K.MarketDecrease }), { marketInfo: solMarket, tokenPriceByMint: prices });
    if (vm.category !== "position") throw new Error("expected position order");
    expect(vm.isMarketOrder).toBe(true);
    expect(vm.triggerThreshold).toBeUndefined();
    expect(vm.sizeDeltaUsd).toBe(-100n * 10n ** 30n);
  });
});

describe("toSolanaOrderViewModel: collateral orders", () => {
  it("maps a zero-size market increase to a deposit", () => {
    const vm = toSolanaOrderViewModel(raw({ kind: K.MarketIncrease, sizeDeltaUsd: 0n }), {
      marketInfo: solMarket,
      tokenPriceByMint: prices,
    });
    expect(vm.category).toBe("collateral");
    if (vm.category !== "collateral") return;
    expect(vm.isDeposit).toBe(true);
    expect(vm.collateralDeltaAmount).toBe(5_000_000n);
    expect(vm.targetCollateralDeltaAmount).toBe(5_000_000n);
    expect(vm.isCollateralSwap).toBe(false);
    expect(vm.typeLabel.message).toBe("Deposit Collateral");
  });

  it("maps a zero-size market decrease to a withdrawal", () => {
    const vm = toSolanaOrderViewModel(raw({ kind: K.MarketDecrease, sizeDeltaUsd: 0n }), {
      marketInfo: solMarket,
      tokenPriceByMint: prices,
    });
    if (vm.category !== "collateral") throw new Error("expected collateral order");
    expect(vm.isDeposit).toBe(false);
    expect(vm.typeLabel.message).toBe("Withdraw Collateral");
  });
});

describe("toSolanaOrderViewModel: swap orders", () => {
  it("maps a USDC → SOL limit swap with GMTrade ratio direction", () => {
    // 300 USDC for at least 2 SOL: 150 USDC per SOL
    const order = raw({
      kind: K.LimitSwap,
      initialCollateralToken: USDC,
      finalOutputToken: WSOL,
      initialCollateralDeltaAmount: 300_000_000n,
      minOutputAmount: 2_000_000_000n,
      primarySwapPath: [MARKET, "OtherMarket1111111111111111111111111111111"],
    });
    const vm = toSolanaOrderViewModel(order, { marketInfo: undefined, tokenPriceByMint: prices });
    expect(vm.category).toBe("swap");
    if (vm.category !== "swap") return;
    expect(vm.primarySwapPath).toEqual([MARKET, "OtherMarket1111111111111111111111111111111"]);
    expect(vm).toMatchObject({
      fromSymbol: "USDC",
      toSymbol: "SOL",
      fromDecimals: 6,
      toDecimals: 9,
      fromAmount: 300_000_000n,
      toMinAmount: 2_000_000_000n,
      ratioLabel: "USDC / SOL",
      triggerRatioText: "150.000",
      markRatioText: "150.000",
    });
    expect(vm.typeLabel.message).toBe("Limit Swap");
  });

  it("leaves the mark ratio undefined without prices and the ratio undefined for unknown tokens", () => {
    const order = raw({
      kind: K.LimitSwap,
      initialCollateralToken: USDC,
      finalOutputToken: WSOL,
      initialCollateralDeltaAmount: 300_000_000n,
      minOutputAmount: 2_000_000_000n,
    });
    const vm = toSolanaOrderViewModel(order, { marketInfo: undefined, tokenPriceByMint: new Map() });
    if (vm.category !== "swap") throw new Error("expected swap order");
    expect(vm.triggerRatioText).toBe("150.000");
    expect(vm.markRatioText).toBeUndefined();

    const unknown = toSolanaOrderViewModel(raw({ kind: K.LimitSwap, initialCollateralToken: "Unknown111", finalOutputToken: WSOL }), {
      marketInfo: undefined,
      tokenPriceByMint: prices,
    });
    if (unknown.category !== "swap") throw new Error("expected swap order");
    expect(unknown.fromSymbol).toBeUndefined();
    expect(unknown.ratioLabel).toBeUndefined();
  });
});

describe("convertSolanaTokenAmount", () => {
  it("converts at the unit prices and refuses missing or zero prices", () => {
    expect(convertSolanaTokenAmount(300_000_000n, USDC_UNIT, SOL_UNIT)).toBe(2_000_000_000n);
    expect(convertSolanaTokenAmount(1n, undefined, SOL_UNIT)).toBeUndefined();
    expect(convertSolanaTokenAmount(1n, USDC_UNIT, undefined)).toBeUndefined();
    expect(convertSolanaTokenAmount(1n, USDC_UNIT, 0n)).toBeUndefined();
  });
});

describe("deriveSwapRatio", () => {
  it("puts the token with the larger human amount first", () => {
    // 1 SOL for at least 140 USDC → "USDC / SOL" 140.000
    const ratio = deriveSwapRatio({
      fromAmount: 1_000_000_000n,
      fromDecimals: 9,
      fromSymbol: "SOL",
      fromPrice: 150n * ONE_USD,
      toMinAmount: 140_000_000n,
      toDecimals: 6,
      toSymbol: "USDC",
      toPrice: ONE_USD,
    });
    expect(ratio).toEqual({ ratioLabel: "USDC / SOL", triggerRatioText: "140.000", markRatioText: "150.000" });
  });
});
