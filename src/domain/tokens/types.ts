import { BigNumber } from "@ethersproject/bignumber";

export type Token = {
  name: string;
  symbol: string;
  assetSymbol?: string;
  baseSymbol?: string;
  decimals: number;
  address: string;
  priceDecimals?: number;
  visualMultiplier?: number;
  visualPrefix?: string;
  wrappedAddress?: string;
  coingeckoUrl?: string;
  coingeckoSymbol?: string;
  metamaskSymbol?: string;
  explorerSymbol?: string;
  explorerUrl?: string;
  reservesUrl?: string;
  imageUrl?: string;

  isUsdg?: boolean;
  isNative?: boolean;
  isWrapped?: boolean;
  isShortable?: boolean;
  isStable?: boolean;
  isSynthetic?: boolean;
  isTempHidden?: boolean;
  isChartDisabled?: boolean;
  isV1Available?: boolean;
  isPlatformToken?: boolean;
  isPlatformTradingToken?: boolean;
};

export type TokenInfo = Token & {
  hasMaxAvailableLong?: boolean;
  hasMaxAvailableShort?: boolean;

  usdgAmount?: BigNumber;
  maxUsdgAmount?: BigNumber;

  poolAmount?: BigNumber;
  bufferAmount?: BigNumber;
  managedAmount?: BigNumber;
  managedUsd?: BigNumber;
  availableAmount?: BigNumber;
  availableUsd?: BigNumber;
  guaranteedUsd?: BigNumber;
  redemptionAmount?: BigNumber;
  reservedAmount?: BigNumber;

  balance?: BigNumber;

  weight?: BigNumber;

  maxPrice?: BigNumber;
  maxPrimaryPrice?: BigNumber;

  minPrice?: BigNumber;
  minPrimaryPrice?: BigNumber;

  contractMaxPrice?: BigNumber;
  contractMinPrice?: BigNumber;

  spread?: BigNumber;

  cumulativeFundingRate?: BigNumber;
  fundingRate?: BigNumber;

  globalShortSize?: BigNumber;

  maxAvailableLong?: BigNumber;
  maxAvailableShort?: BigNumber;

  maxGlobalLongSize?: BigNumber;
  maxGlobalShortSize?: BigNumber;

  maxLongCapacity?: BigNumber;
};

export type InfoTokens = {
  [key: string]: TokenInfo;
};


export type TokenPrices = {
  minPrice: bigint;
  maxPrice: bigint;
};