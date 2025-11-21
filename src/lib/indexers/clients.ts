import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, AVALANCHE_FUJI, BOTANIX, SOURCE_ETHEREUM_MAINNET } from "config/chains";
import { isDevelopment } from "config/env";

import { createClient } from "./utils";

export const chainlinkClient = createClient(SOURCE_ETHEREUM_MAINNET, "chainLink");

export const arbitrumGraphClient = createClient(ARBITRUM, "stats");
export const arbitrumReferralsGraphClient = createClient(ARBITRUM, "referrals");

export const avalancheGraphClient = createClient(AVALANCHE, "stats");
export const avalancheReferralsGraphClient = createClient(AVALANCHE, "referrals");
export const avalancheFujiReferralsGraphClient = createClient(AVALANCHE_FUJI, "referrals");

export const arbitrumSyntheticsStatsClient = createClient(ARBITRUM, "syntheticsStats");
export const avalancheSyntheticsStatsClient = createClient(AVALANCHE, "syntheticsStats");
export const avalancheFujiSyntheticsStatsClient = createClient(AVALANCHE_FUJI, "syntheticsStats");
export const botanixSyntheticsStatsClient = createClient(BOTANIX, "syntheticsStats");

export const arbitrumSubsquidClient = createClient(ARBITRUM, "subsquid");
export const avalancheSubsquidClient = createClient(AVALANCHE, "subsquid");
export const avalancheFujiSubsquidClient = createClient(AVALANCHE_FUJI, "subsquid");
export const arbitrumSepoliaSubsquidClient = createClient(ARBITRUM_SEPOLIA, "subsquid");
export const botanixSubsquidClient = createClient(BOTANIX, "subsquid");

export const REFERRAL_SUPPORTED_CHAIN_IDS = isDevelopment()
  ? [ARBITRUM, AVALANCHE, AVALANCHE_FUJI]
  : [ARBITRUM, AVALANCHE];

export function getSyntheticsGraphClient(chainId: number) {
  if (chainId === ARBITRUM) {
    return arbitrumSyntheticsStatsClient;
  }

  if (chainId === AVALANCHE) {
    return avalancheSyntheticsStatsClient;
  }

  if (chainId === AVALANCHE_FUJI) {
    return avalancheFujiSyntheticsStatsClient;
  }

  if (chainId === BOTANIX) {
    return botanixSyntheticsStatsClient;
  }

  return null;
}

export function getSubsquidGraphClient(chainId: number) {
  if (chainId === ARBITRUM) {
    return arbitrumSubsquidClient;
  }

  if (chainId === AVALANCHE) {
    return avalancheSubsquidClient;
  }

  if (chainId === AVALANCHE_FUJI) {
    return avalancheFujiSubsquidClient;
  }

  if (chainId === ARBITRUM_SEPOLIA) {
    return arbitrumSepoliaSubsquidClient;
  }

  if (chainId === BOTANIX) {
    return botanixSubsquidClient;
  }

  return null;
}

export function getGmxGraphClient(chainId: number) {
  if (chainId === ARBITRUM) {
    return arbitrumGraphClient;
  } else if (chainId === AVALANCHE) {
    return avalancheGraphClient;
  } else if (chainId === AVALANCHE_FUJI) {
    return null;
  } else if (chainId === BOTANIX || chainId === ARBITRUM_SEPOLIA) {
    return null;
  }

  throw new Error(`Unsupported chain ${chainId}`);
}

export function getReferralsGraphClient(chainId) {
  if (chainId === ARBITRUM) {
    return arbitrumReferralsGraphClient;
  } else if (chainId === AVALANCHE) {
    return avalancheReferralsGraphClient;
  } else if (chainId === AVALANCHE_FUJI) {
    return avalancheFujiReferralsGraphClient;
  } else if (chainId === BOTANIX || chainId === ARBITRUM_SEPOLIA) {
    return null;
  }
  throw new Error(`Unsupported chain ${chainId}`);
}
