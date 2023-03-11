import { BigNumber } from "@ethersproject/bignumber";

export type Token = {
  name: string;
  symbol: string;
  baseSymbol?: string;
  decimals: number;
  address: string;
  coingeckoUrl?: string;
  imageUrl?: string;

  isUsdg?: boolean;
  isNative?: boolean;
  isWrapped?: boolean;
  isShortable?: boolean;
  isStable?: boolean;
  isTempHidden?: boolean;
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
