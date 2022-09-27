import { BigNumber } from "@ethersproject/bignumber";

export type Token = {
  address: string;
  decimals: number;
  imageUrl?: string;
  isStable?: boolean;
  name: string;
  symbol: string;
  isTempHidden?: boolean;
  isWrapped?: boolean;
  baseSymbol?: string;
};

export type TokenInfo = {
  address: string;
  name: string;
  symbol: string;
  imageUrl?: string;
  decimals: number;

  hasMaxAvailableLong: boolean;
  hasMaxAvailableShort: boolean;

  isNative?: boolean;
  isShortable?: boolean;
  isWrapped?: boolean;
  isStable?: boolean;

  usdgAmount: BigNumber;
  maxUsdgAmount: BigNumber;

  poolAmount: BigNumber;
  bufferAmount: BigNumber;
  managedAmount: BigNumber;
  managedUsd: BigNumber;
  availableAmount: BigNumber;
  availableUsd: BigNumber;
  guaranteedUsd: BigNumber;
  redemptionAmount: BigNumber;
  reservedAmount: BigNumber;

  balance: BigNumber;

  weight: BigNumber;

  maxPrice?: BigNumber;
  maxPrimaryPrice?: BigNumber;

  minPrice?: BigNumber;
  minPrimaryPrice?: BigNumber;

  contractMaxPrice: BigNumber;
  contractMinPrice: BigNumber;

  cumulativeFundingRate: BigNumber;
  fundingRate: BigNumber;

  globalShortSize: BigNumber;

  maxAvailableLong: BigNumber;
  maxAvailableShort: BigNumber;

  maxGlobalLongSize: BigNumber;
  maxGlobalShortSize: BigNumber;

  maxLongCapacity: BigNumber;
};

export type InfoTokens = {
  [key: string]: TokenInfo;
};
