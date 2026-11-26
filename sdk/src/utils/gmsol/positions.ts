import { GMSOL_LONG, GMSOL_PRECISION, GMSOL_SHORT } from "./constants";
import { getGmsolNextCumulativeBorrowingFactor, getGmsolNextFunding } from "./markets";
import { gmsolMath } from "./numbers";
import type {
  GmsolMarketPrices,
  GmsolMarketState,
  GmsolPendingPositionFees,
  GmsolPerSide,
  GmsolPositionState,
  GmsolSide,
} from "./types";

// a port of gmsol's pending_borrowing_fee_value and pending_funding_fees (crates/model/src/position.rs at 8af1e70c) on the
// market advanced to `now` the way the store program's update_fees_state advances it before every order: the borrowing
// factors, then the funding amounts per size (next_funding_amount_per_size), with the same rounding and checks

// gmsol-programs' FUNDING_AMOUNT_PER_SIZE_ADJUSTMENT, which the amounts per size carry on top of the factor unit
const PER_SIZE_UNIT = 10n ** 10n * GMSOL_PRECISION;

type PerSizePools = readonly [GmsolPerSide, GmsolPerSide];

function getPerSide(getValue: (side: GmsolSide) => bigint): GmsolPerSide {
  return [getValue(GMSOL_LONG), getValue(GMSOL_SHORT)];
}

// gmsol's Prices::validate, which both state updates run first
function validatePrices(prices: GmsolMarketPrices): void {
  for (const { min, max } of [prices.index, prices.long, prices.short]) {
    if (min <= 0n || max <= 0n) {
      throw new Error("invalid prices");
    }
    gmsolMath.toUnsigned(min + max, "prices");
  }
}

// MarketMeta::token_side, so a single-token market's collateral is its long token
function getCollateralSide(market: GmsolMarketState, token: string): GmsolSide {
  if (token === market.longTokenMint) {
    return GMSOL_LONG;
  }
  if (token === market.shortTokenMint) {
    return GMSOL_SHORT;
  }
  throw new Error(`${token} is not a collateral token of ${market.name}`);
}

function getAmountPerSize({
  value,
  openInterest,
  price,
  roundUp,
}: {
  value: bigint;
  openInterest: bigint;
  price: bigint;
  roundUp: boolean;
}): bigint {
  if (value === 0n || openInterest === 0n) {
    return 0n;
  }
  if (roundUp) {
    return gmsolMath.roundUpDiv(
      gmsolMath.mulDivCeil(value, PER_SIZE_UNIT, openInterest, "funding per size"),
      price,
      "funding per size"
    );
  }
  return gmsolMath.mulDiv(value, PER_SIZE_UNIT, openInterest, "funding per size") / price;
}

// a market's pools are pure exactly when its long and short token are one mint (Market::init); a pure pool keeps one
// balance that a delta for either collateral moves and that reads back split in half, the long side taking the odd unit
function addPerSize({ pool, delta, pure }: { pool: GmsolPerSide; delta: GmsolPerSide; pure: boolean }): GmsolPerSide {
  const long = gmsolMath.toSigned(delta[GMSOL_LONG], "funding delta");
  const short = gmsolMath.toSigned(delta[GMSOL_SHORT], "funding delta");
  if (!pure) {
    return [
      gmsolMath.toUnsigned(pool[GMSOL_LONG] + long, "funding per size"),
      gmsolMath.toUnsigned(pool[GMSOL_SHORT] + short, "funding per size"),
    ];
  }
  const balance = gmsolMath.toUnsigned(pool[GMSOL_LONG] + pool[GMSOL_SHORT] + long + short, "funding per size");
  return [(balance + 1n) / 2n, balance / 2n];
}

function replaceSidePool({
  pools,
  side,
  pool,
}: {
  pools: PerSizePools;
  side: GmsolSide;
  pool: GmsolPerSide;
}): PerSizePools {
  return side === GMSOL_LONG ? [pool, pools[GMSOL_SHORT]] : [pools[GMSOL_LONG], pool];
}

function getNextFundingPerSize({
  market,
  prices,
  now,
}: {
  market: GmsolMarketState;
  prices: GmsolMarketPrices;
  now: number;
}): { fee: PerSizePools; claimable: PerSizePools } {
  const current = { fee: market.fundingFeeAmountPerSize, claimable: market.claimableFundingAmountPerSize };
  if (market.openInterest[GMSOL_LONG] === 0n || market.openInterest[GMSOL_SHORT] === 0n) {
    return current;
  }
  const { factor, longsPayShorts } = getGmsolNextFunding(market, now);
  const payer = longsPayShorts ? GMSOL_LONG : GMSOL_SHORT;
  const receiver = longsPayShorts ? GMSOL_SHORT : GMSOL_LONG;
  const paying = market.openInterestByCollateral[payer];
  const payerOpenInterest = market.openInterest[payer];
  const duration = BigInt(Math.max(0, now - market.fundingClock));
  const fundingValue = gmsolMath.applyFactor(
    payerOpenInterest,
    gmsolMath.toUnsigned(duration * factor, "funding factor"),
    "funding value"
  );
  const values = getPerSide((collateral) =>
    gmsolMath.mulDiv(fundingValue, paying[collateral], payerOpenInterest, "funding value")
  );
  const getPrice = (collateral: GmsolSide) => (collateral === GMSOL_LONG ? prices.long : prices.short).max;
  const fee = getPerSide((collateral) =>
    getAmountPerSize({
      value: values[collateral],
      openInterest: paying[collateral],
      price: getPrice(collateral),
      roundUp: true,
    })
  );
  const claimable = getPerSide((collateral) =>
    getAmountPerSize({
      value: values[collateral],
      openInterest: market.openInterest[receiver],
      price: getPrice(collateral),
      roundUp: false,
    })
  );
  const pure = market.longTokenMint === market.shortTokenMint;
  return {
    fee: replaceSidePool({
      pools: current.fee,
      side: payer,
      pool: addPerSize({ pool: current.fee[payer], delta: fee, pure }),
    }),
    claimable: replaceSidePool({
      pools: current.claimable,
      side: receiver,
      pool: addPerSize({ pool: current.claimable[receiver], delta: claimable, pure }),
    }),
  };
}

function getFundingAmount({
  latest,
  ofPosition,
  sizeInUsd,
  roundUp,
  what,
}: {
  latest: bigint;
  ofPosition: bigint;
  sizeInUsd: bigint;
  roundUp: boolean;
  what: string;
}): bigint {
  const diff = latest - ofPosition;
  if (diff < 0n) {
    throw new Error(`the position's ${what} per size is ahead of the market's`);
  }
  return roundUp
    ? gmsolMath.mulDivCeil(sizeInUsd, diff, PER_SIZE_UNIT, what)
    : gmsolMath.mulDiv(sizeInUsd, diff, PER_SIZE_UNIT, what);
}

export function getGmsolPendingPositionFees({
  market,
  prices,
  now,
  position,
}: {
  market: GmsolMarketState;
  prices: GmsolMarketPrices;
  now: number;
  position: GmsolPositionState;
}): GmsolPendingPositionFees {
  if (position.store !== market.store || position.marketToken !== market.marketTokenMint) {
    throw new Error(`the position is not in ${market.name}`);
  }
  const side = position.isLong ? GMSOL_LONG : GMSOL_SHORT;
  const collateral = getCollateralSide(market, position.collateralToken);
  validatePrices(prices);
  const borrowingFactors = getPerSide((each) => {
    const next = getGmsolNextCumulativeBorrowingFactor({ market, prices, now, side: each });
    gmsolMath.toSigned(next - market.borrowingFactor[each], "borrowing delta");
    return next;
  });
  const funding = getNextFundingPerSize({ market, prices, now });

  const borrowingDiff = borrowingFactors[side] - position.borrowingFactor;
  if (borrowingDiff < 0n) {
    throw new Error("the position's borrowing factor is ahead of the market's");
  }
  const size = position.sizeInUsd;
  return {
    borrowingFeeValue: gmsolMath.applyFactor(size, borrowingDiff, "borrowing fee value"),
    fundingFeeAmount: getFundingAmount({
      latest: funding.fee[side][collateral],
      ofPosition: position.fundingFeeAmountPerSize,
      sizeInUsd: size,
      roundUp: true,
      what: "fee",
    }),
    claimableLongTokenAmount: getFundingAmount({
      latest: funding.claimable[side][GMSOL_LONG],
      ofPosition: position.longTokenClaimableFundingAmountPerSize,
      sizeInUsd: size,
      roundUp: false,
      what: "claimable long token",
    }),
    claimableShortTokenAmount: getFundingAmount({
      latest: funding.claimable[side][GMSOL_SHORT],
      ofPosition: position.shortTokenClaimableFundingAmountPerSize,
      sizeInUsd: size,
      roundUp: false,
      what: "claimable short token",
    }),
  };
}
