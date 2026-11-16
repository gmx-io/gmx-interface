import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, isSolanaNetwork, MEGAETH } from "./chains";

export function getIsV1Supported(chainId: number) {
  return [AVALANCHE, ARBITRUM].includes(chainId);
}

export function getIsExpressSupported(chainId: number) {
  return [AVALANCHE, ARBITRUM, ARBITRUM_SEPOLIA, MEGAETH].includes(chainId);
}

export type NetworkFeature =
  | "gmxAccount"
  | "express"
  | "oneClickTrading"
  | "twap"
  | "stopMarket"
  | "swap"
  | "collateralDeposit"
  | "collateralWithdrawal"
  | "evmOnlyPages";

const SOLANA_FEATURES: Record<NetworkFeature, boolean> = {
  gmxAccount: false,
  express: false,
  oneClickTrading: false,
  twap: false,
  stopMarket: false,
  swap: false,
  collateralDeposit: false,
  collateralWithdrawal: false,
  evmOnlyPages: false,
};

/** Solana is off for every listed feature. On EVM, Express and One-Click follow `getIsExpressSupported`; the rest stay available. */
export function getNetworkFeatures(networkId: number): Record<NetworkFeature, boolean> {
  if (isSolanaNetwork(networkId)) {
    return SOLANA_FEATURES;
  }

  const express = getIsExpressSupported(networkId);

  return {
    gmxAccount: true,
    express,
    oneClickTrading: express,
    twap: true,
    stopMarket: true,
    swap: true,
    collateralDeposit: true,
    collateralWithdrawal: true,
    evmOnlyPages: true,
  };
}
