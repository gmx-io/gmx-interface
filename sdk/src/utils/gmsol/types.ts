export type GmsolMarketConfig = {
  tradeMath?: "gmsol";
  minCollateralUsd?: bigint;
  minPositionSizeUsd?: bigint;
};

export type Decimal = { coefficient: bigint; scale: number };

export type GmsolSide = 0 | 1;
export type GmsolPerSide = readonly [long: bigint, short: bigint];

// USD with 20 decimals per raw token unit
export type GmsolPriceRange = { min: bigint; max: bigint };
export type GmsolMarketPrices = { index: GmsolPriceRange; long: GmsolPriceRange; short: GmsolPriceRange };
export type GmsolPnlFactorKind = "maxAfterDeposit" | "maxAfterWithdrawal" | "maxForTrader";

export type GmsolFundingParams = {
  exponent: bigint;
  factor: bigint;
  maxFactorPerSecond: bigint;
  minFactorPerSecond: bigint;
  increaseFactorPerSecond: bigint;
  decreaseFactorPerSecond: bigint;
  thresholdForStableFunding: bigint;
  thresholdForDecreaseFunding: bigint;
};

// Native USD and factors use 20 decimals, funding per size uses 30, and clocks are Unix seconds.
export type GmsolMarketState = {
  name: string;
  marketTokenMint: string;
  longTokenMint: string;
  shortTokenMint: string;
  store: string;
  config: {
    reserveFactor: bigint;
    openInterestReserveFactor: bigint;
    borrowingFeeReceiverFactor: bigint;
    positionImpactDistributeFactor: bigint;
    minPositionImpactPoolAmount: bigint;
    maxPnlFactorForLongDeposit: bigint;
    maxPnlFactorForShortDeposit: bigint;
    maxPnlFactorForLongWithdrawal: bigint;
    maxPnlFactorForShortWithdrawal: bigint;
    maxPnlFactorForLongTrader: bigint;
    maxPnlFactorForShortTrader: bigint;
  };
  skipBorrowingFeeForSmallerSide: boolean;
  ignoreOpenInterestForUsageFactor: boolean;
  borrowingFeeFactor: GmsolPerSide;
  borrowingFeeExponent: GmsolPerSide;
  borrowingFeeOptimalUsageFactor: GmsolPerSide;
  borrowingFeeBaseFactor: GmsolPerSide;
  borrowingFeeAboveOptimalUsageFactor: GmsolPerSide;
  maxOpenInterest: GmsolPerSide;
  funding: GmsolFundingParams;
  primary: GmsolPerSide;
  openInterest: GmsolPerSide;
  openInterestInTokens: GmsolPerSide;
  // per position side, the amounts held against the long and the short collateral token
  openInterestByCollateral: readonly [GmsolPerSide, GmsolPerSide];
  positionImpactPoolAmount: bigint;
  borrowingFactor: GmsolPerSide;
  // per position side, the cumulative funding amounts per size for the long and the short collateral token
  fundingFeeAmountPerSize: readonly [GmsolPerSide, GmsolPerSide];
  claimableFundingAmountPerSize: readonly [GmsolPerSide, GmsolPerSide];
  totalBorrowing: GmsolPerSide;
  priceImpactDistributionClock: number;
  borrowingClock: number;
  fundingClock: number;
  // the factor saved at the funding clock, positive when longs pay
  fundingFactorPerSecond: bigint;
};

export type GmsolPositionState = {
  store: string;
  marketToken: string;
  collateralToken: string;
  isLong: boolean;
  // USD with 20 decimals
  sizeInUsd: bigint;
  // the market's cumulative values when the position last changed
  borrowingFactor: bigint;
  fundingFeeAmountPerSize: bigint;
  longTokenClaimableFundingAmountPerSize: bigint;
  shortTokenClaimableFundingAmountPerSize: bigint;
};

export type GmsolNextFunding = {
  // the paying side's funding factor per second, 0 when either side has no open interest
  factor: bigint;
  longsPayShorts: boolean;
};

export type GmsolMarketStatus = {
  fundingFactorPerSecond: bigint;
  longsPayShorts: boolean;
  // USD with 20 decimals still open to traders on each side
  liquidityForLong: bigint;
  liquidityForShort: bigint;
};

export type GmsolPendingPositionFees = {
  // USD with 20 decimals
  borrowingFeeValue: bigint;
  // raw units of the collateral token, owed by the position
  fundingFeeAmount: bigint;
  // raw units of the market's long and short token, owed to the position
  claimableLongTokenAmount: bigint;
  claimableShortTokenAmount: bigint;
};

export type GmsolFeeDiscountConfig = {
  maxRank: number;
  // Native discount factors use 20 decimals.
  byRank: readonly bigint[];
  referredUser: bigint;
};
