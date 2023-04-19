import { BigNumber } from "ethers";
import { TokenData } from "domain/synthetics/tokens";

export type PnlFactorType = "FOR_DEPOSITS" | "FOR_WITHDRAWALS" | "FOR_TRADERS";

export type Market = {
  marketTokenAddress: string;
  indexTokenAddress: string;
  longTokenAddress: string;
  shortTokenAddress: string;
  isSameCollaterals: boolean;
  isSpotOnly: boolean;
  name: string;
  data: string;
};

export type MarketPoolTokens = {
  longToken: TokenData;
  shortToken: TokenData;
  indexToken: TokenData;
};

export type MarketInfo = Market &
  MarketPoolTokens & {
    longPoolAmount: BigNumber;
    shortPoolAmount: BigNumber;

    longPoolAmountAdjustment: BigNumber;
    shortPoolAmountAdjustment: BigNumber;

    poolValueMax: BigNumber;
    poolValueMin: BigNumber;

    reserveFactorLong: BigNumber;
    reserveFactorShort: BigNumber;

    totalBorrowingLong: BigNumber;
    totalBorrowingShort: BigNumber;

    totalBorrowingFees: BigNumber;

    cummulativeBorrowingFactorLong: BigNumber;
    cummulativeBorrowingFactorShort: BigNumber;

    borrowingFeeReceiverFactor: BigNumber;

    positionImpactPoolAmount: BigNumber;

    minCollateralFactor: BigNumber;

    swapImpactPoolAmountLong: BigNumber;
    swapImpactPoolAmountShort: BigNumber;

    maxPnlFactorForTradersLong: BigNumber;
    maxPnlFactorForTradersShort: BigNumber;
    maxPnlFactorForWithdrawalsLong: BigNumber;
    maxPnlFactorForWithdrawalsShort: BigNumber;
    maxPnlFactorForDepositsLong: BigNumber;
    maxPnlFactorForDepositsShort: BigNumber;

    pnlLongMin: BigNumber;
    pnlLongMax: BigNumber;
    pnlShortMin: BigNumber;
    pnlShortMax: BigNumber;

    netPnlMin: BigNumber;
    netPnlMax: BigNumber;

    claimableFundingAmountLong?: BigNumber;
    claimableFundingAmountShort?: BigNumber;

    longInterestUsd: BigNumber;
    shortInterestUsd: BigNumber;
    longInterestInTokens: BigNumber;
    shortInterestInTokens: BigNumber;

    positionFeeFactor: BigNumber;
    positionImpactFactorPositive: BigNumber;
    positionImpactFactorNegative: BigNumber;
    maxPositionImpactFactorPositive: BigNumber;
    maxPositionImpactFactorNegative: BigNumber;
    maxPositionImpactFactorForLiquidations: BigNumber;
    positionImpactExponentFactor: BigNumber;

    swapFeeFactor: BigNumber;
    swapImpactFactorPositive: BigNumber;
    swapImpactFactorNegative: BigNumber;
    swapImpactExponentFactor: BigNumber;

    borrowingFactorPerSecondForLongs: BigNumber;
    borrowingFactorPerSecondForShorts: BigNumber;

    fundingPerSecond: BigNumber;
    longsPayShorts: boolean;
    fundingAmountPerSize_LongCollateral_LongPosition: BigNumber;
    fundingAmountPerSize_LongCollateral_ShortPosition: BigNumber;
    fundingAmountPerSize_ShortCollateral_LongPosition: BigNumber;
    fundingAmountPerSize_ShortCollateral_ShortPosition: BigNumber;
  };

export type MarketsInfoData = {
  [marketAddress: string]: MarketInfo;
};

export type MarketsData = {
  [marketTokenAddress: string]: Market;
};

export type ContractMarketPrices = {
  indexTokenPrice: {
    min: BigNumber;
    max: BigNumber;
  };
  longTokenPrice: {
    min: BigNumber;
    max: BigNumber;
  };
  shortTokenPrice: {
    min: BigNumber;
    max: BigNumber;
  };
};
