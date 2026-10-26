import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, AVALANCHE_FUJI, MEGAETH } from "config/chains";
import { isDevelopment } from "config/env";

import { createClient } from "./utils";

const arbitrumReferralsGraphClient = createClient(ARBITRUM, "referrals");

const avalancheReferralsGraphClient = createClient(AVALANCHE, "referrals");
const avalancheFujiReferralsGraphClient = createClient(AVALANCHE_FUJI, "referrals");
const megaethReferralsGraphClient = createClient(MEGAETH, "referrals");

const arbitrumSyntheticsStatsClient = createClient(ARBITRUM, "syntheticsStats");
const avalancheSyntheticsStatsClient = createClient(AVALANCHE, "syntheticsStats");
const avalancheFujiSyntheticsStatsClient = createClient(AVALANCHE_FUJI, "syntheticsStats");
const megaethSyntheticsStatsClient = createClient(MEGAETH, "syntheticsStats");
const arbitrumSubsquidClient = createClient(ARBITRUM, "subsquid");
const avalancheSubsquidClient = createClient(AVALANCHE, "subsquid");
const avalancheFujiSubsquidClient = createClient(AVALANCHE_FUJI, "subsquid");
const arbitrumSepoliaSubsquidClient = createClient(ARBITRUM_SEPOLIA, "subsquid");
const megaethSubsquidClient = createClient(MEGAETH, "subsquid");
export const REFERRAL_SUPPORTED_CHAIN_IDS = isDevelopment()
  ? [ARBITRUM, AVALANCHE, MEGAETH, AVALANCHE_FUJI]
  : [ARBITRUM, AVALANCHE, MEGAETH];

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

  if (chainId === MEGAETH) {
    return megaethSyntheticsStatsClient;
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

  if (chainId === MEGAETH) {
    return megaethSubsquidClient;
  }

  return null;
}

export function getReferralsGraphClient(chainId: number) {
  if (chainId === ARBITRUM) {
    return arbitrumReferralsGraphClient;
  } else if (chainId === AVALANCHE) {
    return avalancheReferralsGraphClient;
  } else if (chainId === AVALANCHE_FUJI) {
    return avalancheFujiReferralsGraphClient;
  } else if (chainId === MEGAETH) {
    return megaethReferralsGraphClient;
  } else if (chainId === ARBITRUM_SEPOLIA) {
    return null;
  }
  throw new Error(`Unsupported chain ${chainId}`);
}
