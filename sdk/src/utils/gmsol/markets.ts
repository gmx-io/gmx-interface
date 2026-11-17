import { bigMath } from "utils/bigmath";

import { GMSOL_LONG, GMSOL_PRECISION, GMSOL_SHORT, GMSOL_SIDES } from "./constants";
import { gmsolMath } from "./numbers";
import type {
  GmsolFundingParams,
  GmsolMarketPrices,
  GmsolMarketState,
  GmsolMarketStatus,
  GmsolNextFunding,
  GmsolPnlFactorKind,
  GmsolPriceRange,
  GmsolSide,
} from "./types";

// a port of gmsol's pool value, borrowing and pnl math (crates/model/src/market at 8af1e70c), on the same integers as the
// program's get_market_status and get_market_token_price views

type ConfigKey = keyof GmsolMarketState["config"];

const MAX_PNL_FACTOR: Record<GmsolPnlFactorKind, readonly [ConfigKey, ConfigKey]> = {
  maxAfterDeposit: ["maxPnlFactorForLongDeposit", "maxPnlFactorForShortDeposit"],
  maxAfterWithdrawal: ["maxPnlFactorForLongWithdrawal", "maxPnlFactorForShortWithdrawal"],
  maxForTrader: ["maxPnlFactorForLongTrader", "maxPnlFactorForShortTrader"],
};

function pickPrice(price: GmsolPriceRange, maximize: boolean): bigint {
  return maximize ? price.max : price.min;
}

function getSidePrice(prices: GmsolMarketPrices, side: GmsolSide): GmsolPriceRange {
  return side === GMSOL_LONG ? prices.long : prices.short;
}

function getOtherSide(side: GmsolSide): GmsolSide {
  return side === GMSOL_LONG ? GMSOL_SHORT : GMSOL_LONG;
}

export function getGmsolReservedValue({
  market,
  prices,
  side,
}: {
  market: GmsolMarketState;
  prices: GmsolMarketPrices;
  side: GmsolSide;
}): bigint {
  return side === GMSOL_LONG
    ? gmsolMath.toUnsigned(market.openInterestInTokens[GMSOL_LONG] * prices.index.max, "reserved value")
    : market.openInterest[GMSOL_SHORT];
}

export function getGmsolPoolValueWithoutPnl({
  market,
  prices,
  side,
  maximize,
}: {
  market: GmsolMarketState;
  prices: GmsolMarketPrices;
  side: GmsolSide;
  maximize: boolean;
}): bigint {
  return gmsolMath.toUnsigned(
    market.primary[side] * pickPrice(getSidePrice(prices, side), maximize),
    "pool value without pnl"
  );
}

// maximizing values longs at the index ask and shorts at the bid
export function getGmsolPendingPnl({
  market,
  indexPrice,
  side,
  maximize,
}: {
  market: GmsolMarketState;
  indexPrice: GmsolPriceRange;
  side: GmsolSide;
  maximize: boolean;
}): bigint {
  const openInterest = market.openInterest[side];
  const openInterestInTokens = market.openInterestInTokens[side];
  if (openInterest === 0n && openInterestInTokens === 0n) {
    return 0n;
  }
  const price = (side === GMSOL_LONG) !== maximize ? indexPrice.min : indexPrice.max;
  const value = gmsolMath.toUnsigned(openInterestInTokens * price, "position value");
  return gmsolMath.toSigned(side === GMSOL_LONG ? value - openInterest : openInterest - value, "pending pnl");
}

export function getGmsolBorrowingFactorPerSecond({
  market,
  prices,
  side,
}: {
  market: GmsolMarketState;
  prices: GmsolMarketPrices;
  side: GmsolSide;
}): bigint {
  const reserved = getGmsolReservedValue({ market, prices, side });
  if (reserved === 0n) {
    return 0n;
  }
  if (market.skipBorrowingFeeForSmallerSide && market.openInterest[side] < market.openInterest[getOtherSide(side)]) {
    return 0n;
  }
  const poolValue = getGmsolPoolValueWithoutPnl({ market, prices, side, maximize: false });
  if (poolValue === 0n) {
    throw new Error("borrowing factor of an empty pool");
  }
  const optimal = market.borrowingFeeOptimalUsageFactor[side];
  if (optimal === 0n) {
    const reservedAfterExponent = gmsolMath.applyExponentFactor(
      reserved,
      market.borrowingFeeExponent[side],
      "borrowing"
    );
    const usage = gmsolMath.divToFactor(reservedAfterExponent, poolValue, "borrowing usage");
    return gmsolMath.applyFactor(usage, market.borrowingFeeFactor[side], "borrowing factor");
  }
  let usage = gmsolMath.divToFactor(
    reserved,
    gmsolMath.applyFactor(poolValue, market.config.openInterestReserveFactor, "reservable pool value"),
    "reserve usage"
  );
  if (!market.ignoreOpenInterestForUsageFactor) {
    const openInterestUsage = gmsolMath.divToFactor(
      market.openInterest[side],
      market.maxOpenInterest[side],
      "open interest usage"
    );
    usage = bigMath.max(usage, openInterestUsage);
  }
  const base = market.borrowingFeeBaseFactor[side];
  let factor = gmsolMath.applyFactor(usage, base, "borrowing factor");
  if (usage > optimal && GMSOL_PRECISION > optimal) {
    const above = market.borrowingFeeAboveOptimalUsageFactor[side];
    const additional = gmsolMath.mulDiv(
      above > base ? above - base : 0n,
      usage - optimal,
      GMSOL_PRECISION - optimal,
      "borrowing factor"
    );
    factor = gmsolMath.toUnsigned(factor + additional, "borrowing factor");
  }
  return factor;
}

export function getGmsolNextCumulativeBorrowingFactor({
  market,
  prices,
  now,
  side,
}: {
  market: GmsolMarketState;
  prices: GmsolMarketPrices;
  now: number;
  side: GmsolSide;
}): bigint {
  const duration = BigInt(Math.max(0, now - market.borrowingClock));
  const increase = gmsolMath.toUnsigned(
    getGmsolBorrowingFactorPerSecond({ market, prices, side }) * duration,
    "borrowing increase"
  );
  return gmsolMath.toUnsigned(market.borrowingFactor[side] + increase, "cumulative borrowing factor");
}

export function getGmsolPendingBorrowingFees({
  market,
  prices,
  now,
  side,
}: {
  market: GmsolMarketState;
  prices: GmsolMarketPrices;
  now: number;
  side: GmsolSide;
}): bigint {
  const cumulative = getGmsolNextCumulativeBorrowingFactor({ market, prices, now, side });
  const pending =
    gmsolMath.applyFactor(market.openInterest[side], cumulative, "borrowing fees") - market.totalBorrowing[side];
  if (pending < 0n) {
    throw new Error("negative pending borrowing fees");
  }
  return pending;
}

export function getGmsolNextPositionImpactPoolAmount(market: GmsolMarketState, now: number): bigint {
  const current = market.positionImpactPoolAmount;
  const factor = market.config.positionImpactDistributeFactor;
  const floor = market.config.minPositionImpactPoolAmount;
  if (factor === 0n || current <= floor) {
    return current;
  }
  const duration = BigInt(Math.max(0, now - market.priceImpactDistributionClock));
  const distributed = gmsolMath.applyFactor(duration, factor, "impact distribution");
  return current - bigMath.min(distributed, current - floor);
}

// signed, since losses can exceed the pool
export function getGmsolPoolValue({
  market,
  prices,
  now,
  pnlFactorKind,
  maximize,
}: {
  market: GmsolMarketState;
  prices: GmsolMarketPrices;
  now: number;
  pnlFactorKind: GmsolPnlFactorKind;
  maximize: boolean;
}): bigint {
  const sideValues = GMSOL_SIDES.map((side) => getGmsolPoolValueWithoutPnl({ market, prices, side, maximize }));
  const fees = gmsolMath.toUnsigned(
    GMSOL_SIDES.reduce((sum, side) => sum + getGmsolPendingBorrowingFees({ market, prices, now, side }), 0n),
    "borrowing fees"
  );
  let value =
    sideValues[GMSOL_LONG] +
    sideValues[GMSOL_SHORT] +
    gmsolMath.applyFactor(
      fees,
      gmsolMath.toUnsigned(GMSOL_PRECISION - market.config.borrowingFeeReceiverFactor, "pool share"),
      "pool borrowing fees"
    );
  for (const side of GMSOL_SIDES) {
    const pnl = getGmsolPendingPnl({ market, indexPrice: prices.index, side, maximize: !maximize });
    const cap = gmsolMath.applyFactor(sideValues[side], market.config[MAX_PNL_FACTOR[pnlFactorKind][side]], "pnl cap");
    value -= bigMath.min(pnl, cap);
  }
  value -= gmsolMath.toUnsigned(
    getGmsolNextPositionImpactPoolAmount(market, now) * pickPrice(prices.index, !maximize),
    "impact pool value"
  );
  return gmsolMath.toSigned(value, "pool value");
}

// a port of the funding and liquidity parts of gmsol's MarketCalculations::status, with its rounding and overflow checks

function toSignedFactor(value: bigint): bigint {
  return gmsolMath.toSigned(value, "signed conversion");
}

function boundMagnitude(value: bigint, min: bigint, max: bigint): bigint {
  if (min > max) {
    throw new Error("funding factor min is above max");
  }
  const magnitude = bigMath.abs(value);
  if (magnitude < min) {
    return value < 0n ? -toSignedFactor(min) : toSignedFactor(min);
  }
  if (magnitude > max) {
    return value < 0n ? -toSignedFactor(max) : toSignedFactor(max);
  }
  return value;
}

type FundingChange = "increase" | "decrease" | "none";

function getFundingChange({
  params,
  saved,
  long,
  short,
  diffFactor,
}: {
  params: GmsolFundingParams;
  saved: bigint;
  long: bigint;
  short: bigint;
  diffFactor: bigint;
}): FundingChange {
  const sameDirection = (saved > 0n && long > short) || (saved < 0n && long < short);
  if (!sameDirection || diffFactor > params.thresholdForStableFunding) {
    return "increase";
  }
  return diffFactor < params.thresholdForDecreaseFunding ? "decrease" : "none";
}

// gmsol next_funding_factor_per_second: the rate moves from the saved one over the time since the funding clock
function getNextFundingFactorPerSecond({
  params,
  saved,
  duration,
  long,
  short,
}: {
  params: GmsolFundingParams;
  saved: bigint;
  duration: bigint;
  long: bigint;
  short: bigint;
}): GmsolNextFunding {
  const diff = bigMath.abs(long - short);
  if (diff === 0n && params.increaseFactorPerSecond === 0n) {
    return { factor: 0n, longsPayShorts: true };
  }
  const diffFactor = gmsolMath.mulDiv(
    gmsolMath.applyExponentFactor(diff, params.exponent, "funding"),
    GMSOL_PRECISION,
    gmsolMath.toUnsigned(long + short, "total"),
    "diff"
  );

  if (params.increaseFactorPerSecond === 0n) {
    const factor = gmsolMath.applyFactor(diffFactor, params.factor, "funding factor");
    return {
      factor: bigMath.min(factor, params.maxFactorPerSecond),
      longsPayShorts: long > short,
    };
  }

  const change = getFundingChange({ params, saved, long, short, diffFactor });
  let next = saved;
  if (change === "increase") {
    const increase = gmsolMath.toUnsigned(
      gmsolMath.applyFactor(diffFactor, params.increaseFactorPerSecond, "increase") * duration,
      "increase"
    );
    next = gmsolMath.toSigned(
      saved + (long < short ? -toSignedFactor(increase) : toSignedFactor(increase)),
      "funding increase"
    );
  } else if (change === "decrease" && saved !== 0n) {
    const magnitude = bigMath.abs(saved);
    const decrease = gmsolMath.toUnsigned(params.decreaseFactorPerSecond * duration, "decrease");
    if (magnitude <= decrease) {
      next = saved > 0n ? 1n : -1n;
    } else {
      next = saved > 0n ? toSignedFactor(magnitude - decrease) : -toSignedFactor(magnitude - decrease);
    }
  }
  const bounded = boundMagnitude(
    boundMagnitude(next, 0n, params.maxFactorPerSecond),
    params.minFactorPerSecond,
    params.maxFactorPerSecond
  );
  return { factor: bigMath.abs(bounded), longsPayShorts: bounded > 0n };
}

function getLiquidity({
  market,
  prices,
  side,
}: {
  market: GmsolMarketState;
  prices: GmsolMarketPrices;
  side: GmsolSide;
}): bigint {
  const reserved = getGmsolReservedValue({ market, prices, side });
  const reserveFactor = bigMath.min(market.config.reserveFactor, market.config.openInterestReserveFactor);
  const maxLiquidity = bigMath.min(
    gmsolMath.applyFactor(
      getGmsolPoolValueWithoutPnl({ market, prices, side, maximize: false }),
      reserveFactor,
      "max reserve"
    ),
    market.maxOpenInterest[side]
  );
  return maxLiquidity > reserved ? maxLiquidity - reserved : 0n;
}

export function getGmsolNextFunding(market: GmsolMarketState, now: number): GmsolNextFunding {
  const [long, short] = market.openInterest;
  if (long === 0n || short === 0n) {
    return { factor: 0n, longsPayShorts: true };
  }
  const duration = BigInt(Math.max(0, now - market.fundingClock));
  return getNextFundingFactorPerSecond({
    params: market.funding,
    saved: market.fundingFactorPerSecond,
    duration,
    long,
    short,
  });
}

export function getGmsolMarketStatus({
  market,
  prices,
  now,
}: {
  market: GmsolMarketState;
  prices: GmsolMarketPrices;
  now: number;
}): GmsolMarketStatus {
  const funding = getGmsolNextFunding(market, now);
  return {
    fundingFactorPerSecond: funding.factor,
    longsPayShorts: funding.longsPayShorts,
    liquidityForLong: getLiquidity({ market, prices, side: GMSOL_LONG }),
    liquidityForShort: getLiquidity({ market, prices, side: GMSOL_SHORT }),
  };
}
