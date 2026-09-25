import { describe, expect, it } from "vitest";

import {
  estimateLiquidationHours,
  feePerDayUsd,
  getSolanaPoolName,
  NO_LIQUIDATION_BY_FEES_HOURS,
  toGmxLeverage,
  toGmxUsd,
  toSolanaPositionViewModel,
  unitPriceToTokenPrice,
} from "./solanaPositionAdapter";
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

  it("projects an hourly rate over 24h on the position size, keeping the sign", () => {
    // -0.01% per hour on 1000 USD = -0.1 USD per hour = -2.4 USD per day
    const ratePerHour = -(ONE_USD / 10_000n);
    expect(feePerDayUsd(ratePerHour, 1_000n * ONE_USD)).toBe(-(24n * 10n ** 29n));
    expect(feePerDayUsd(undefined, 1_000n * ONE_USD)).toBeUndefined();
  });
});

describe("getSolanaPoolName", () => {
  it("joins long and short symbols, collapses single-token pools and maps WGMX to GMX", () => {
    // GMTrade shows the raw token symbol (WSOL, not SOL); only WGMX is displayed as GMX.
    expect(getSolanaPoolName(marketInfo)).toBe("WSOL-USDC");
    expect(getSolanaPoolName({ ...marketInfo, longToken: USDC })).toBe("USDC");
    expect(getSolanaPoolName({ ...marketInfo, longToken: "9wX6Qz1Y5YQe71dfnFYFfZYXZhKqjYKQwdqfrRkmYUSX" })).toBe(
      "GMX-USDC"
    );
    expect(getSolanaPoolName({ ...marketInfo, longToken: "unknown" })).toBeUndefined();
    expect(getSolanaPoolName(undefined)).toBeUndefined();
  });
});

describe("estimateLiquidationHours", () => {
  const GMX_USD = 10n ** 30n;
  const base = { netValue: 100n * GMX_USD, sizeInUsd: 1_000n * GMX_USD, minCollateralFactor: ONE_USD / 100n }; // 1% → 10 USD

  it("returns undefined without rates or factor", () => {
    expect(
      estimateLiquidationHours({
        ...base,
        minCollateralFactor: undefined,
        borrowingFeePerDay: 0n,
        fundingFeePerDay: 0n,
      })
    ).toBeUndefined();
    expect(estimateLiquidationHours({ ...base, borrowingFeePerDay: undefined, fundingFeePerDay: 0n })).toBeUndefined();
  });

  it("counts hours until paid fees consume the margin above maintenance", () => {
    // (100 - 10) USD over 9 USD/day paid = 10 days = 240 hours
    expect(
      estimateLiquidationHours({ ...base, borrowingFeePerDay: -4n * GMX_USD, fundingFeePerDay: -5n * GMX_USD })
    ).toBe(240n);
    // hour precision: 90 USD over 4320 USD/day = 0.5 hour
    expect(estimateLiquidationHours({ ...base, borrowingFeePerDay: -4_320n * GMX_USD, fundingFeePerDay: 0n })).toBe(0n);
    expect(estimateLiquidationHours({ ...base, borrowingFeePerDay: -2_160n * GMX_USD, fundingFeePerDay: 0n })).toBe(1n);
  });

  it("maps zero or net positive fees to the no-liquidation sentinel", () => {
    expect(estimateLiquidationHours({ ...base, borrowingFeePerDay: 0n, fundingFeePerDay: 0n })).toBe(
      NO_LIQUIDATION_BY_FEES_HOURS
    );
    expect(
      estimateLiquidationHours({ ...base, borrowingFeePerDay: -1n * GMX_USD, fundingFeePerDay: 2n * GMX_USD })
    ).toBe(NO_LIQUIDATION_BY_FEES_HOURS);
  });
});

describe("toSolanaPositionViewModel", () => {
  it("keeps base fields and hides derived values when the price is unavailable", () => {
    const calculation: SolanaPositionCalculation = { priceUnavailable: true, unavailableReason: "no-price" };
    const vm = toSolanaPositionViewModel(raw, calculation, marketInfo, undefined);
    expect(vm.key).toBe("position");
    expect(vm.symbol).toBe("SOL");
    expect(vm.displayMarketName).toBe("SOL/USD");
    expect(vm.poolName).toBe("WSOL-USDC");
    expect(vm.collateralSymbol).toBe("USDC");
    expect(vm.collateralDecimals).toBe(6);
    expect(vm.sizeInUsd).toBe(1_000n * 10n ** 30n);
    expect(vm.entryPrice).toBeUndefined();
    expect(vm.netValue).toBeUndefined();
    expect(vm.netCollateralValue).toBeUndefined();
    expect(vm.markPrice).toBeUndefined();
    expect(vm.priceUnavailable).toBe(true);
  });

  it("derives daily fees from the market rates of the position side even without a price", () => {
    const rates = {
      ...marketInfo,
      longBorrowingFeeRateHour: -(ONE_USD / 10_000n),
      longFundingFeeRateHour: ONE_USD / 20_000n,
      shortBorrowingFeeRateHour: -ONE_USD,
      shortFundingFeeRateHour: -ONE_USD,
    };
    const vm = toSolanaPositionViewModel(raw, { priceUnavailable: true }, rates, undefined);
    expect(vm.borrowingFeePerDay).toBe(-(24n * 10n ** 29n));
    expect(vm.fundingFeePerDay).toBe(12n * 10n ** 29n);
    const short = toSolanaPositionViewModel({ ...raw, isLong: false }, { priceUnavailable: true }, rates, undefined);
    expect(short.borrowingFeePerDay).toBe(-(24_000n * 10n ** 30n));
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
        pendingClaimableFundingFeeValueInLongToken: ONE_USD / 4n,
        pendingClaimableFundingFeeValueInShortToken: ONE_USD / 4n,
        closeOrderFeeValue: 1n * ONE_USD,
        netValue: 106n * ONE_USD,
        leverage: 10n * ONE_USD,
        liquidationPrice: perLamport / 2n,
      },
    };
    const ticker = { symbol: "SOL", price: 210n * ONE_USD, minUnitPrice: perLamport, maxUnitPrice: perLamport };
    // USDC: 1 USD per whole token = 1e20 / 1e6 per smallest unit
    const usdcTicker = { symbol: "USDC", unitPrice: ONE_USD / 10n ** 6n, minUnitPrice: 1n, maxUnitPrice: 1n };
    const vm = toSolanaPositionViewModel(raw, calculation, marketInfo, ticker, usdcTicker);
    expect(vm.entryPrice).toBe(200n * 10n ** 30n);
    expect(vm.markPrice).toBe(210n * 10n ** 30n);
    expect(vm.liquidationPrice).toBe(100n * 10n ** 30n);
    expect(vm.collateralValue).toBe(100n * 10n ** 30n);
    expect(vm.pendingBorrowingFee).toBe(1n * 10n ** 30n);
    // 10 - 1 - 2 - 1 = 6 USD after fees, over 100 + 1 USD collateral incl. close fee
    expect(vm.pnlAfterFees).toBe(6n * 10n ** 30n);
    expect(vm.pnlAfterFeesBps).toBe((6n * 10_000n) / 101n);
    // displayed PnL before fees: 10 USD over 100 USD collateral
    expect(vm.pendingPnl).toBe(10n * 10n ** 30n);
    expect(vm.pendingPnlBps).toBe(1_000n);
    expect(vm.leverage).toBe(100_000n); // 10x with 4 decimals
    expect(vm.netValue).toBe(106n * 10n ** 30n);
    // margin after fees: 100 - 1 - 2 = 97 USD, i.e. 97 USDC at 1 USD
    expect(vm.netCollateralValue).toBe(97n * 10n ** 30n);
    expect(vm.netCollateralAmount).toBe(97n * 10n ** 6n);
    expect(vm.pendingClaimableFundingFee).toBe(5n * 10n ** 29n);
    // no rates or factor in marketInfo → no estimate; liquidation price present → no warning
    expect(vm.estimatedLiquidationHours).toBeUndefined();
    expect(vm.noLiquidationPriceReason).toBeUndefined();
  });

  it("estimates the time to liquidation from the market rates and factor of the position side", () => {
    const calculation: SolanaPositionCalculation = {
      priceUnavailable: false,
      status: {
        entryPrice: 1n,
        collateralValue: 100n * ONE_USD,
        pendingPnl: 0n,
        pendingBorrowingFeeValue: 0n,
        pendingFundingFeeValue: 0n,
        pendingClaimableFundingFeeValueInLongToken: 0n,
        pendingClaimableFundingFeeValueInShortToken: 0n,
        closeOrderFeeValue: 0n,
        netValue: 100n * ONE_USD,
        liquidationPrice: 1n,
      },
    };
    const rates = {
      ...marketInfo,
      longBorrowingFeeRateHour: -(ONE_USD / 10_000n), // -0.01%/h on 1000 USD = -2.4 USD/day
      longFundingFeeRateHour: 0n,
      minCollateralFactorForLong: ONE_USD / 100n, // 10 USD maintenance
    };
    const vm = toSolanaPositionViewModel(raw, calculation, rates, undefined);
    // (100 - 10) / 2.4 = 37.5 days = 900 hours
    expect(vm.estimatedLiquidationHours).toBe(900n);
  });

  it("explains a missing liquidation price when the collateral covers the position", () => {
    const status = {
      entryPrice: 1n,
      collateralValue: 2_000n * ONE_USD,
      pendingPnl: 0n,
      pendingBorrowingFeeValue: 0n,
      pendingFundingFeeValue: 0n,
      pendingClaimableFundingFeeValueInLongToken: 0n,
      pendingClaimableFundingFeeValueInShortToken: 0n,
      closeOrderFeeValue: 0n,
      netValue: 2_000n * ONE_USD,
    };
    // long with USDC (stable) collateral worth more than the size
    const long = toSolanaPositionViewModel(raw, { priceUnavailable: false, status }, marketInfo, undefined);
    expect(long.noLiquidationPriceReason).toBe("long-stable-collateral-covers-size");
    // short whose collateral token amount exceeds the size in tokens
    const short = toSolanaPositionViewModel(
      { ...raw, isLong: false, collateralToken: SOL, collateralAmount: raw.sizeInTokens },
      { priceUnavailable: false, status },
      marketInfo,
      undefined
    );
    expect(short.noLiquidationPriceReason).toBe("short-collateral-covers-size");
    // long with insufficient stable collateral: no explanation
    const plain = toSolanaPositionViewModel(
      raw,
      { priceUnavailable: false, status: { ...status, collateralValue: 10n * ONE_USD } },
      marketInfo,
      undefined
    );
    expect(plain.noLiquidationPriceReason).toBeUndefined();
  });

  it("omits the net collateral token amount without a collateral price", () => {
    const calculation: SolanaPositionCalculation = {
      priceUnavailable: false,
      status: {
        entryPrice: 1n,
        collateralValue: 100n * ONE_USD,
        pendingPnl: 0n,
        pendingBorrowingFeeValue: 0n,
        pendingFundingFeeValue: 0n,
        pendingClaimableFundingFeeValueInLongToken: 0n,
        pendingClaimableFundingFeeValueInShortToken: 0n,
        closeOrderFeeValue: 0n,
        netValue: 100n * ONE_USD,
      },
    };
    const vm = toSolanaPositionViewModel(raw, calculation, marketInfo, undefined, undefined);
    expect(vm.netCollateralValue).toBe(100n * 10n ** 30n);
    expect(vm.netCollateralAmount).toBeUndefined();
  });
});
