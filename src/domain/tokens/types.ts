import { BigNumber } from "@ethersproject/bignumber";

export type Token = {
  address: string;
  decimals: number;
  imageUrl: string;
  isStable?: boolean;
  isNative?: boolean;
  isShortable?: boolean;
  name: string;
  symbol: string;
};

export type InfoToken = {
  address: string;
  availableAmount: BigNumber;
  availableUsd: BigNumber;
  balance: BigNumber;
  bufferAmount: BigNumber;
  contractMaxPrice: BigNumber;
  contractMinPrice: BigNumber;
  decimals: number;
  globalShortSize: BigNumber;
  guaranteedUsd: BigNumber;
  hasMaxAvailableLong: boolean;
  hasMaxAvailableShort: boolean;
  imageUrl: string;
  isNative: boolean;
  isShortable: boolean;
  managedAmount: BigNumber;
  managedUsd: BigNumber;
  maxAvailableLong: BigNumber;
  maxAvailableShort: BigNumber;
  maxGlobalLongSize: BigNumber;
  maxGlobalShortSize: BigNumber;
  maxLongCapacity: BigNumber;
  maxPrice: BigNumber;
  maxPrimaryPrice: BigNumber;
  maxUsdgAmount: BigNumber;
  minPrice: BigNumber;
  minPrimaryPrice: BigNumber;
  name: string;
  poolAmount: BigNumber;
  redemptionAmount: BigNumber;
  reservedAmount: BigNumber;
  symbol: string;
  usdgAmount: BigNumber;
  weight: BigNumber;
};
