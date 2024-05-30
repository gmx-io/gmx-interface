export type Token = {
  name: string;
  symbol: string;
  assetSymbol?: string;
  baseSymbol?: string;
  decimals: number;
  address: string;
  priceDecimals?: number;
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

  usdgAmount?: bigint;
  maxUsdgAmount?: bigint;

  poolAmount?: bigint;
  bufferAmount?: bigint;
  managedAmount?: bigint;
  managedUsd?: bigint;
  availableAmount?: bigint;
  availableUsd?: bigint;
  guaranteedUsd?: bigint;
  redemptionAmount?: bigint;
  reservedAmount?: bigint;

  balance?: bigint;

  weight?: bigint;

  maxPrice?: bigint;
  maxPrimaryPrice?: bigint;

  minPrice?: bigint;
  minPrimaryPrice?: bigint;

  contractMaxPrice?: bigint;
  contractMinPrice?: bigint;

  spread?: bigint;

  cumulativeFundingRate?: bigint;
  fundingRate?: bigint;

  globalShortSize?: bigint;

  maxAvailableLong?: bigint;
  maxAvailableShort?: bigint;

  maxGlobalLongSize?: bigint;
  maxGlobalShortSize?: bigint;

  maxLongCapacity?: bigint;
};

export type InfoTokens = {
  [key: string]: TokenInfo;
};

export type TokenPrices = {
  minPrice: bigint;
  maxPrice: bigint;
};
