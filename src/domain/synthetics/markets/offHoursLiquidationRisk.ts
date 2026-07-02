import { ARBITRUM } from "sdk/configs/chainIds";
import type { MarketInfo } from "sdk/utils/markets/types";

export const OFF_HOURS_DOCS_URL = "https://docs.gmx.io/docs/trading/overview/#off-hours-behavior";

const GOLD = "0x0Df2BE76F517BCF0000AbfFcB6344B3b2aC4Cc4f";
const SILVER = "0x448Fa722717df299ee197E2F6d8EB7911EFF6cEc";
const WTIOIL = "0xda81cdd397210C08cFc567f93982E148A3aac8a6";
const BRENTOIL = "0x6F287D071800BfA847B4a7a7104BE33F87Ce9E74";
const NATGAS = "0x2Ce2bc8B0f9d000f359d756a5816C125474Bb39b";

type OffHoursOverride = Pick<
  MarketInfo,
  | "minCollateralFactor"
  | "minCollateralFactorForLiquidation"
  | "positionFeeFactorForBalanceWasImproved"
  | "positionFeeFactorForBalanceWasNotImproved"
  | "positionImpactFactorNegative"
  | "maxOpenInterestLong"
  | "maxOpenInterestShort"
>;

const COMMON = {
  minCollateralFactor: 35n * 10n ** 27n,
  minCollateralFactorForLiquidation: 10n ** 28n,
  positionFeeFactorForBalanceWasImproved: 4n * 10n ** 26n,
  positionFeeFactorForBalanceWasNotImproved: 6n * 10n ** 26n,
};

const OI_2_5M = 2_500_000n * 10n ** 30n;
const OI_1_5M = 1_500_000n * 10n ** 30n;
const OI_250K = 250_000n * 10n ** 30n;
const IMPACT_3E9 = 3n * 10n ** 21n;
const IMPACT_5E9 = 5n * 10n ** 21n;
const IMPACT_2E8 = 2n * 10n ** 22n;

export const OFF_HOURS_MARKET_OVERRIDES: Record<string, OffHoursOverride> = {
  [GOLD.toLowerCase()]: {
    ...COMMON,
    positionImpactFactorNegative: IMPACT_3E9,
    maxOpenInterestLong: OI_2_5M,
    maxOpenInterestShort: OI_2_5M,
  },
  [SILVER.toLowerCase()]: {
    ...COMMON,
    positionImpactFactorNegative: IMPACT_5E9,
    maxOpenInterestLong: OI_2_5M,
    maxOpenInterestShort: OI_2_5M,
  },
  [WTIOIL.toLowerCase()]: {
    ...COMMON,
    positionImpactFactorNegative: IMPACT_3E9,
    maxOpenInterestLong: OI_2_5M,
    maxOpenInterestShort: OI_2_5M,
  },
  [BRENTOIL.toLowerCase()]: {
    ...COMMON,
    positionImpactFactorNegative: IMPACT_3E9,
    maxOpenInterestLong: OI_1_5M,
    maxOpenInterestShort: OI_1_5M,
  },
  [NATGAS.toLowerCase()]: {
    minCollateralFactor: 4n * 10n ** 28n,
    minCollateralFactorForLiquidation: 10n ** 28n,
    positionFeeFactorForBalanceWasImproved: 4n * 10n ** 26n,
    positionFeeFactorForBalanceWasNotImproved: 8n * 10n ** 26n,
    positionImpactFactorNegative: IMPACT_2E8,
    maxOpenInterestLong: OI_250K,
    maxOpenInterestShort: OI_250K,
  },
};

const OFF_HOURS_BORROWING_FACTOR_NUMERATOR = 50n;
const OFF_HOURS_BORROWING_FACTOR_DENOMINATOR = 45n;

export function isOffHoursMarket(chainId: number, marketTokenAddress: string | undefined): boolean {
  if (chainId !== ARBITRUM || !marketTokenAddress) return false;
  return marketTokenAddress.toLowerCase() in OFF_HOURS_MARKET_OVERRIDES;
}

export function getOffHoursMarketInfo(chainId: number, marketInfo: MarketInfo | undefined): MarketInfo | undefined {
  if (!marketInfo || !isOffHoursMarket(chainId, marketInfo.marketTokenAddress)) return undefined;

  const override = OFF_HOURS_MARKET_OVERRIDES[marketInfo.marketTokenAddress.toLowerCase()];

  if (marketInfo.minCollateralFactor >= override.minCollateralFactor) return undefined;

  return {
    ...marketInfo,
    ...override,
    borrowingFactorPerSecondForLongs:
      (marketInfo.borrowingFactorPerSecondForLongs * OFF_HOURS_BORROWING_FACTOR_NUMERATOR) /
      OFF_HOURS_BORROWING_FACTOR_DENOMINATOR,
    borrowingFactorPerSecondForShorts:
      (marketInfo.borrowingFactorPerSecondForShorts * OFF_HOURS_BORROWING_FACTOR_NUMERATOR) /
      OFF_HOURS_BORROWING_FACTOR_DENOMINATOR,
  };
}
