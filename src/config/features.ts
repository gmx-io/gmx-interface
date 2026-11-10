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
  | "evmOnlyPages"
  // Positive funding waits for a claim in Claims; gmsol pays it out with the position's next order.
  | "fundingClaims"
  // Open price impact is stored on the position until close; gmsol applies it when the position opens.
  | "pendingPriceImpact"
  // Lifetime fees of an open position come from the subsquid indexer, which has no Solana data.
  | "positionFeeHistory";

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
  fundingClaims: false,
  pendingPriceImpact: false,
  positionFeeHistory: false,
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
    fundingClaims: true,
    pendingPriceImpact: true,
    positionFeeHistory: true,
  };
}
