import { createClient } from "./utils";
import { ARBITRUM, ARBITRUM_TESTNET, AVALANCHE, AVALANCHE_FUJI, ETH_MAINNET } from "config/chains";

export const chainlinkClient = createClient(ETH_MAINNET, "chainLink");

export const arbitrumGraphClient = createClient(ARBITRUM, "stats");
export const arbitrumReferralsGraphClient = createClient(ARBITRUM, "referrals");
export const nissohGraphClient = createClient(ARBITRUM, "nissohVault");

export const avalancheGraphClient = createClient(AVALANCHE, "stats");
export const avalancheReferralsGraphClient = createClient(AVALANCHE, "referrals");

export const avalancheFujiSyntheticsStatsClient = createClient(AVALANCHE_FUJI, "syntheticsStats");

export function getSyntheticsGraphClient(chainId: number) {
  if (chainId === AVALANCHE_FUJI) {
    return avalancheFujiSyntheticsStatsClient;
  }

  return null;
}

export function getGmxGraphClient(chainId: number) {
  if (chainId === ARBITRUM) {
    return arbitrumGraphClient;
  } else if (chainId === AVALANCHE) {
    return avalancheGraphClient;
  } else if (chainId === ARBITRUM_TESTNET) {
    return null;
  }

  throw new Error(`Unsupported chain ${chainId}`);
}
