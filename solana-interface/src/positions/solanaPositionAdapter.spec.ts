import { describe, expect, it } from "vitest";

import { toGmxLeverage, toGmxUsd, toSolanaPositionViewModel, unitPriceToTokenPrice } from "./solanaPositionAdapter";
import type { RawSolanaPosition, SolanaPositionCalculation } from "./types";

const ONE_USD = 10n ** 20n;
const SOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const raw: RawSolanaPosition = {
  pubkey: "position",
  base64: "",
  slot: 1,
  owner: "owner",
  marketToken: "MarketTokenAddress111111111111111111111111",
  collateralToken: USDC,
  kind: 1,
  isLong: true,
  sizeInUsd: 1_000n * ONE_USD,
  sizeInTokens: 5n * 10n ** 9n,
  collateralAmount: 100n * 10n ** 6n,
  borrowingFactor: 0n,
  fundingFeeAmountPerSize: 0n,
  longTokenClaimableFundingAmountPerSize: 0n,
  shortTokenClaimableFundingAmountPerSize: 0n,
  increasedAt: 1_700_000_000n,
  decreasedAt: 0n,
  updatedAtSlot: 1n,
  tradeId: 1n,
};

const marketInfo = { marketToken: raw.marketToken, indexToken: SOL, longToken: SOL, shortToken: USDC, supply: "1" };

describe("unit conversions", () => {
  it("scales 20-decimal USD to 30 decimals", () => {
    expect(toGmxUsd(ONE_USD)).toBe(10n ** 30n);
  });

  it("turns a per-unit price into a per-token 30-decimal price", () => {
    // 200 USD per SOL = 200e20 / 1e9 per lamport
    const perLamport = (200n * ONE_USD) / 10n ** 9n;
    expect(unitPriceToTokenPrice(perLamport, 9)).toBe(200n * 10n ** 30n);
  });

  it("scales 20-decimal leverage to 4 decimals", () => {
    expect(toGmxLeverage(25n * 10n ** 19n)).toBe(25_000n); // 2.5x
  });
});

describe("toSolanaPositionViewModel", () => {
  it("keeps base fields and hides derived values when the price is unavailable", () => {
    const calculation: SolanaPositionCalculation = { priceUnavailable: true, unavailableReason: "no-price" };
    const vm = toSolanaPositionViewModel(raw, calculation, marketInfo, undefined);
    expect(vm.key).toBe("position");
    expect(vm.symbol).toBe("SOL");
    expect(vm.displayMarketName).toBe("SOL/USD");
    expect(vm.collateralSymbol).toBe("USDC");
    expect(vm.collateralDecimals).toBe(6);
    expect(vm.sizeInUsd).toBe(1_000n * 10n ** 30n);
    expect(vm.entryPrice).toBeUndefined();
    expect(vm.netValue).toBeUndefined();
    expect(vm.markPrice).toBeUndefined();
    expect(vm.priceUnavailable).toBe(true);
  });

  it("falls back to a shortened market token when the market is unknown", () => {
    const vm = toSolanaPositionViewModel(raw, { priceUnavailable: true }, undefined, undefined);
    expect(vm.symbol).toBe("Market…1111");
    expect(vm.displayMarketName).toBe("Market…1111");
  });

  it("converts SDK status fields and computes PnL after fees", () => {
    const perLamport = (200n * ONE_USD) / 10n ** 9n;
    const calculation: SolanaPositionCalculation = {
      priceUnavailable: false,
      status: {
        entryPrice: perLamport,
        collateralValue: 100n * ONE_USD,
        pendingPnl: 10n * ONE_USD,
        pendingBorrowingFeeValue: -1n * ONE_USD,
        pendingFundingFeeValue: 2n * ONE_USD,
        pendingClaimableFundingFeeValueInLongToken: 0n,
        pendingClaimableFundingFeeValueInShortToken: 0n,
        closeOrderFeeValue: 1n * ONE_USD,
        netValue: 106n * ONE_USD,
        leverage: 10n * ONE_USD,
        liquidationPrice: perLamport / 2n,
      },
    };
    const ticker = { symbol: "SOL", price: 210n * ONE_USD, minUnitPrice: perLamport, maxUnitPrice: perLamport };
    const vm = toSolanaPositionViewModel(raw, calculation, marketInfo, ticker);
    expect(vm.entryPrice).toBe(200n * 10n ** 30n);
    expect(vm.markPrice).toBe(210n * 10n ** 30n);
    expect(vm.liquidationPrice).toBe(100n * 10n ** 30n);
    expect(vm.collateralValue).toBe(100n * 10n ** 30n);
    expect(vm.pendingBorrowingFee).toBe(1n * 10n ** 30n);
    // 10 - 1 - 2 - 1 = 6 USD after fees, over 100 + 1 USD collateral incl. close fee
    expect(vm.pnlAfterFees).toBe(6n * 10n ** 30n);
    expect(vm.pnlAfterFeesBps).toBe((6n * 10_000n) / 101n);
    expect(vm.leverage).toBe(100_000n); // 10x with 4 decimals
    expect(vm.netValue).toBe(106n * 10n ** 30n);
  });
});
