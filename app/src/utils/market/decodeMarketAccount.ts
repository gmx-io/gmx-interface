/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { BN, translateAddress } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

import { useStoreProgram } from '@/contexts/anchor';
import { Market, MarketState } from '@/selectors/market/types';

const BN_TWO = new BN(2);

type StoreProgram = ReturnType<typeof useStoreProgram>;

export interface DecodedMarketAccount {
  meta: Market;
  state: MarketState;
}

const readPureFlag = (raw: number): boolean => {
  if (raw === 0) return false;
  if (raw === 1) return true;
  throw new Error(`Invalid pure flag: ${raw}`);
};

// Decode an on-chain `market` account using the anchor codec carried by the
// store program, then project it into the `{ meta, state }` shape consumed by
// the application store. Mirrors the inline transformation used in the legacy
// RPC-polling implementation of useMarkets so both paths populate identical
// state.
export function decodeMarketAccount(
  buffer: Buffer,
  marketAddress: PublicKey | string,
  storeProgram: StoreProgram
): DecodedMarketAccount | null {
  let raw;
  try {
    raw = storeProgram.coder.accounts.decode('market', buffer);
  } catch (err) {
    console.error(
      `[marin] anchor decode error for market ${String(marketAddress)}`,
      err
    );
    return null;
  }
  if (!raw) return null;

  const market = {
    ...raw.state,
    meta: raw.meta,
    flags: raw.flags,
    config: raw.config,
    state: raw.state.other,
    indexer: raw.indexer,
  };

  const isPurePrimary = readPureFlag(market.pools.primary.pool.isPure);
  const isPureSwapImpact = readPureFlag(market.pools.swapImpact.pool.isPure);
  const isPureClaimableFee = readPureFlag(
    market.pools.claimableFee.pool.isPure
  );
  const isPureOpenInterestForLong = readPureFlag(
    market.pools.openInterestForLong.pool.isPure
  );
  const isPureOpenInterestForShort = readPureFlag(
    market.pools.openInterestForShort.pool.isPure
  );
  const isPureOpenInterestInTokensForLong = readPureFlag(
    market.pools.openInterestInTokensForLong.pool.isPure
  );
  const isPureOpenInterestInTokensForShort = readPureFlag(
    market.pools.openInterestInTokensForShort.pool.isPure
  );
  const isPurePositionImpact = readPureFlag(
    market.pools.positionImpact.pool.isPure
  );
  const isPureBorrowingFactor = readPureFlag(
    market.pools.borrowingFactor.pool.isPure
  );
  const isPureFundingAmountPerSizeForLong = readPureFlag(
    market.pools.fundingAmountPerSizeForLong.pool.isPure
  );
  const isPureFundingAmountPerSizeForShort = readPureFlag(
    market.pools.fundingAmountPerSizeForShort.pool.isPure
  );
  const isPureClaimableFundingAmountPerSizeForLong = readPureFlag(
    market.pools.claimableFundingAmountPerSizeForLong.pool.isPure
  );
  const isPureClaimableFundingAmountPerSizeForShort = readPureFlag(
    market.pools.claimableFundingAmountPerSizeForShort.pool.isPure
  );
  const isPureCollateralSumForLong = readPureFlag(
    market.pools.collateralSumForLong.pool.isPure
  );
  const isPureCollateralSumForShort = readPureFlag(
    market.pools.collateralSumForShort.pool.isPure
  );
  const isPureTotalBorrowing = readPureFlag(
    market.pools.totalBorrowing.pool.isPure
  );

  const meta: Market = {
    marketAddress: translateAddress(marketAddress),
    marketTokenAddress: market.meta.marketTokenMint,
    indexTokenAddress: market.meta.indexTokenMint,
    longTokenAddress: market.meta.longTokenMint,
    shortTokenAddress: market.meta.shortTokenMint,
    isDisabled: !(market.flags.value & 1),
    isSingle: !!(market.flags.value & (1 << 1)),
    AutoDeleveragingEnabledForLong: !!(market.flags.value & (1 << 2)),
    AutoDeleveragingEnabledForShort: !!(market.flags.value & (1 << 3)),
    GtEnabled: !!(market.flags.value & (1 << 4)),
    isSpotOnly: false,
  };

  const state: MarketState = {
    minCollateralFactor: market.config.minCollateralFactor,
    minCollateralFactorForLiquidation:
      market.config.minCollateralFactorForLiquidation,
    minCollateralFactorForOpenInterestMultiplierForLong:
      market.config.minCollateralFactorForOpenInterestMultiplierForLong,
    minCollateralFactorForOpenInterestMultiplierForShort:
      market.config.minCollateralFactorForOpenInterestMultiplierForShort,
    maxPnlFactorForLongTrader: market.config.maxPnlFactorForLongTrader,
    maxPnlFactorForShortTrader: market.config.maxPnlFactorForShortTrader,
    maxPnlFactorForLongAdl: market.config.maxPnlFactorForLongAdl,
    maxPnlFactorForShortAdl: market.config.maxPnlFactorForShortAdl,
    maxPnlFactorForLongDeposit: market.config.maxPnlFactorForLongDeposit,
    maxPnlFactorForShortDeposit: market.config.maxPnlFactorForShortDeposit,
    maxPnlFactorForLongWithdrawal: market.config.maxPnlFactorForLongWithdrawal,
    maxPnlFactorForShortWithdrawal:
      market.config.maxPnlFactorForShortWithdrawal,
    positionImpactDistributeFactor:
      market.config.positionImpactDistributeFactor,
    minPositionImpactPoolAmount: market.config.minPositionImpactPoolAmount,
    swapFeeReceiverFactor: market.config.swapFeeReceiverFactor,
    swapFeeFactorForPositiveImpact: market.config.swapFeeFactorForPositiveImpact,
    swapFeeFactorForNegativeImpact: market.config.swapFeeFactorForNegativeImpact,
    borrowingFeeReceiverFactor: market.config.borrowingFeeReceiverFactor,
    borrowingFeeFactorForLong: market.config.borrowingFeeFactorForLong,
    borrowingFeeFactorForShort: market.config.borrowingFeeFactorForShort,
    borrowingFeeExponentForLong: market.config.borrowingFeeExponentForLong,
    borrowingFeeExponentForShort: market.config.borrowingFeeExponentForShort,
    fundingFeeFactor: market.config.fundingFeeFactor,
    fundingFeeExponent: market.config.fundingFeeExponent,
    fundingFeeMaxFactorPerSecond: market.config.fundingFeeMaxFactorPerSecond,
    fundingFeeMinFactorPerSecond: market.config.fundingFeeMinFactorPerSecond,
    fundingFeeIncreaseFactorPerSecond:
      market.config.fundingFeeIncreaseFactorPerSecond,
    fundingFeeDecreaseFactorPerSecond:
      market.config.fundingFeeDecreaseFactorPerSecond,
    fundingFeeThresholdForStableFunding:
      market.config.fundingFeeThresholdForStableFunding,
    fundingFeeThresholdForDecreaseFunding:
      market.config.fundingFeeThresholdForDecreaseFunding,
    orderFeeReceiverFactor: market.config.orderFeeReceiverFactor,
    orderFeeFactorForPositiveImpact:
      market.config.orderFeeFactorForPositiveImpact,
    orderFeeFactorForNegativeImpact:
      market.config.orderFeeFactorForNegativeImpact,
    reserveFactor: market.config.reserveFactor,
    openInterestReserveFactor: market.config.openInterestReserveFactor,
    maxPoolAmountForLongToken: market.config.maxPoolAmountForLongToken,
    maxPoolAmountForShortToken: market.config.maxPoolAmountForShortToken,
    maxPoolValueForDepositForLongToken:
      market.config.maxPoolValueForDepositForLongToken,
    maxPoolValueForDepositForShortToken:
      market.config.maxPoolValueForDepositForShortToken,
    maxOpenInterestForLong: market.config.maxOpenInterestForLong,
    maxOpenInterestForShort: market.config.maxOpenInterestForShort,
    minPnlFactorAfterLongAdl: market.config.minPnlFactorAfterLongAdl,
    minPnlFactorAfterShortAdl: market.config.minPnlFactorAfterShortAdl,
    minCollateralValue: market.config.minCollateralValue,
    minPositionSizeUsd: market.config.minPositionSizeUsd,
    maxPositivePositionImpactFactor:
      market.config.maxPositivePositionImpactFactor,
    maxNegativePositionImpactFactor:
      market.config.maxNegativePositionImpactFactor,
    maxPositionImpactFactorForLiquidations:
      market.config.maxPositionImpactFactorForLiquidations,
    positionImpactExponent: market.config.positionImpactExponent,
    positionImpactPositiveFactor: market.config.positionImpactPositiveFactor,
    positionImpactNegativeFactor: market.config.positionImpactNegativeFactor,
    swapImpactExponent: market.config.swapImpactExponent,
    swapImpactPositiveFactor: market.config.swapImpactPositiveFactor,
    swapImpactNegativeFactor: market.config.swapImpactNegativeFactor,

    longPoolAmount: isPurePrimary
      ? market.pools.primary.pool.longTokenAmount.div(BN_TWO)
      : market.pools.primary.pool.longTokenAmount,
    shortPoolAmount: isPurePrimary
      ? market.pools.primary.pool.longTokenAmount.div(BN_TWO)
      : market.pools.primary.pool.shortTokenAmount,
    openInterest: {
      long: isPureOpenInterestForLong
        ? market.pools.openInterestForLong.pool.longTokenAmount
            .div(BN_TWO)
            .add(
              market.pools.openInterestForLong.pool.longTokenAmount.div(BN_TWO)
            )
        : market.pools.openInterestForLong.pool.longTokenAmount.add(
            market.pools.openInterestForLong.pool.shortTokenAmount
          ),
      short: isPureOpenInterestForShort
        ? market.pools.openInterestForShort.pool.longTokenAmount
            .div(BN_TWO)
            .add(
              market.pools.openInterestForShort.pool.longTokenAmount.div(BN_TWO)
            )
        : market.pools.openInterestForShort.pool.longTokenAmount.add(
            market.pools.openInterestForShort.pool.shortTokenAmount
          ),
    },
    primaryLongTokenAmount: isPurePrimary
      ? market.pools.primary.pool.longTokenAmount.div(BN_TWO)
      : market.pools.primary.pool.longTokenAmount,
    primaryShortTokenAmount: isPurePrimary
      ? market.pools.primary.pool.longTokenAmount.div(BN_TWO)
      : market.pools.primary.pool.shortTokenAmount,
    swapImpactLongTokenAmount: isPureSwapImpact
      ? market.pools.swapImpact.pool.longTokenAmount.div(BN_TWO)
      : market.pools.swapImpact.pool.longTokenAmount,
    swapImpactShortTokenAmount: isPureSwapImpact
      ? market.pools.swapImpact.pool.longTokenAmount.div(BN_TWO)
      : market.pools.swapImpact.pool.shortTokenAmount,
    claimableFeeLongTokenAmount: isPureClaimableFee
      ? market.pools.claimableFee.pool.longTokenAmount.div(BN_TWO)
      : market.pools.claimableFee.pool.longTokenAmount,
    claimableFeeShortTokenAmount: isPureClaimableFee
      ? market.pools.claimableFee.pool.longTokenAmount.div(BN_TWO)
      : market.pools.claimableFee.pool.shortTokenAmount,
    openInterestForLongLongTokenAmount: isPureOpenInterestForLong
      ? market.pools.openInterestForLong.pool.longTokenAmount.div(BN_TWO)
      : market.pools.openInterestForLong.pool.longTokenAmount,
    openInterestForLongShortTokenAmount: isPureOpenInterestForLong
      ? market.pools.openInterestForLong.pool.longTokenAmount.div(BN_TWO)
      : market.pools.openInterestForLong.pool.shortTokenAmount,
    openInterestForShortLongTokenAmount: isPureOpenInterestForShort
      ? market.pools.openInterestForShort.pool.longTokenAmount.div(BN_TWO)
      : market.pools.openInterestForShort.pool.longTokenAmount,
    openInterestForShortShortTokenAmount: isPureOpenInterestForShort
      ? market.pools.openInterestForShort.pool.longTokenAmount.div(BN_TWO)
      : market.pools.openInterestForShort.pool.shortTokenAmount,
    openInterestInTokensForLongLongTokenAmount: isPureOpenInterestInTokensForLong
      ? market.pools.openInterestInTokensForLong.pool.longTokenAmount.div(BN_TWO)
      : market.pools.openInterestInTokensForLong.pool.longTokenAmount,
    openInterestInTokensForLongShortTokenAmount:
      isPureOpenInterestInTokensForLong
        ? market.pools.openInterestInTokensForLong.pool.longTokenAmount.div(
            BN_TWO
          )
        : market.pools.openInterestInTokensForLong.pool.shortTokenAmount,
    openInterestInTokensForShortLongTokenAmount:
      isPureOpenInterestInTokensForShort
        ? market.pools.openInterestInTokensForShort.pool.longTokenAmount.div(
            BN_TWO
          )
        : market.pools.openInterestInTokensForShort.pool.longTokenAmount,
    openInterestInTokensForShortShortTokenAmount:
      isPureOpenInterestInTokensForShort
        ? market.pools.openInterestInTokensForShort.pool.longTokenAmount.div(
            BN_TWO
          )
        : market.pools.openInterestInTokensForShort.pool.shortTokenAmount,
    positionImpactLongTokenAmount: isPurePositionImpact
      ? market.pools.positionImpact.pool.longTokenAmount.div(BN_TWO)
      : market.pools.positionImpact.pool.longTokenAmount,
    positionImpactShortTokenAmount: isPurePositionImpact
      ? market.pools.positionImpact.pool.longTokenAmount.div(BN_TWO)
      : market.pools.positionImpact.pool.shortTokenAmount,
    borrowingFactorLongTokenAmount: isPureBorrowingFactor
      ? market.pools.borrowingFactor.pool.longTokenAmount.div(BN_TWO)
      : market.pools.borrowingFactor.pool.longTokenAmount,
    borrowingFactorShortTokenAmount: isPureBorrowingFactor
      ? market.pools.borrowingFactor.pool.longTokenAmount.div(BN_TWO)
      : market.pools.borrowingFactor.pool.shortTokenAmount,
    fundingAmountPerSizeForLongLongTokenAmount:
      isPureFundingAmountPerSizeForLong
        ? market.pools.fundingAmountPerSizeForLong.pool.longTokenAmount.div(
            BN_TWO
          )
        : market.pools.fundingAmountPerSizeForLong.pool.longTokenAmount,
    fundingAmountPerSizeForLongShortTokenAmount:
      isPureFundingAmountPerSizeForLong
        ? market.pools.fundingAmountPerSizeForLong.pool.longTokenAmount.div(
            BN_TWO
          )
        : market.pools.fundingAmountPerSizeForLong.pool.shortTokenAmount,
    fundingAmountPerSizeForShortLongTokenAmount:
      isPureFundingAmountPerSizeForShort
        ? market.pools.fundingAmountPerSizeForShort.pool.longTokenAmount.div(
            BN_TWO
          )
        : market.pools.fundingAmountPerSizeForShort.pool.longTokenAmount,
    fundingAmountPerSizeForShortShortTokenAmount:
      isPureFundingAmountPerSizeForShort
        ? market.pools.fundingAmountPerSizeForShort.pool.longTokenAmount.div(
            BN_TWO
          )
        : market.pools.fundingAmountPerSizeForShort.pool.shortTokenAmount,
    claimableFundingAmountPerSizeForLongLongTokenAmount:
      isPureClaimableFundingAmountPerSizeForLong
        ? market.pools.claimableFundingAmountPerSizeForLong.pool.longTokenAmount.div(
            BN_TWO
          )
        : market.pools.claimableFundingAmountPerSizeForLong.pool.longTokenAmount,
    claimableFundingAmountPerSizeForLongShortTokenAmount:
      isPureClaimableFundingAmountPerSizeForLong
        ? market.pools.claimableFundingAmountPerSizeForLong.pool.longTokenAmount.div(
            BN_TWO
          )
        : market.pools.claimableFundingAmountPerSizeForLong.pool.shortTokenAmount,
    claimableFundingAmountPerSizeForShortLongTokenAmount:
      isPureClaimableFundingAmountPerSizeForShort
        ? market.pools.claimableFundingAmountPerSizeForShort.pool.longTokenAmount.div(
            BN_TWO
          )
        : market.pools.claimableFundingAmountPerSizeForShort.pool.longTokenAmount,
    claimableFundingAmountPerSizeForShortShortTokenAmount:
      isPureClaimableFundingAmountPerSizeForShort
        ? market.pools.claimableFundingAmountPerSizeForShort.pool.longTokenAmount.div(
            BN_TWO
          )
        : market.pools.claimableFundingAmountPerSizeForShort.pool.shortTokenAmount,
    collateralSumForLongLongTokenAmount: isPureCollateralSumForLong
      ? market.pools.collateralSumForLong.pool.longTokenAmount.div(BN_TWO)
      : market.pools.collateralSumForLong.pool.longTokenAmount,
    collateralSumForLongShortTokenAmount: isPureCollateralSumForLong
      ? market.pools.collateralSumForLong.pool.longTokenAmount.div(BN_TWO)
      : market.pools.collateralSumForLong.pool.shortTokenAmount,
    collateralSumForShortLongTokenAmount: isPureCollateralSumForShort
      ? market.pools.collateralSumForShort.pool.longTokenAmount.div(BN_TWO)
      : market.pools.collateralSumForShort.pool.longTokenAmount,
    collateralSumForShortShortTokenAmount: isPureCollateralSumForShort
      ? market.pools.collateralSumForShort.pool.longTokenAmount.div(BN_TWO)
      : market.pools.collateralSumForShort.pool.shortTokenAmount,
    totalBorrowingLongTokenAmount: isPureTotalBorrowing
      ? market.pools.totalBorrowing.pool.longTokenAmount.div(BN_TWO)
      : market.pools.totalBorrowing.pool.longTokenAmount,
    totalBorrowingShortTokenAmount: isPureTotalBorrowing
      ? market.pools.totalBorrowing.pool.longTokenAmount.div(BN_TWO)
      : market.pools.totalBorrowing.pool.shortTokenAmount,

    longTokenBalance: market.state.longTokenBalance,
    shortTokenBalance: market.state.shortTokenBalance,
    fundingFactorPerSecond: market.state.fundingFactorPerSecond,
    tradeCount: market.state.tradeCount,
    depositCount: market.indexer.depositCount,
    withdrawalCount: market.indexer.withdrawalCount,
    orderCount: market.indexer.orderCount,
  } as MarketState;

  return { meta, state };
}
