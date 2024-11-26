import { createClient } from "./utils";
import {
  ARBITRUM,
  ARBITRUM_TESTNET,
  AVALANCHE,
  BLAST_SEPOLIA_TESTNET,
  ETH_MAINNET,
  MORPH_L2,
  MORPH_MAINNET,
  OPTIMISM_GOERLI_TESTNET,
  OPTIMISM_MAINNET,
  SEPOLIA_TESTNET,
} from "config/chains";

export const chainlinkClient = createClient(ETH_MAINNET, "chainLink");

export const arbitrumGraphClient = createClient(ARBITRUM, "stats");
export const arbitrumReferralsGraphClient = createClient(ARBITRUM, "referrals");
export const nissohGraphClient = createClient(ARBITRUM, "nissohVault");

export const avalancheGraphClient = createClient(AVALANCHE, "stats");
export const avalancheReferralsGraphClient = createClient(AVALANCHE, "referrals");

export function getGmxGraphClient(chainId: number) {
  if (chainId === ARBITRUM) {
    return arbitrumGraphClient;
  } else if (chainId === AVALANCHE) {
    return avalancheGraphClient;
  } else if (chainId === ARBITRUM_TESTNET) {
    return null;
  } else if (chainId === SEPOLIA_TESTNET) {
    return null;
  } else if (chainId === OPTIMISM_GOERLI_TESTNET) {
    return null;
  } else if (chainId === OPTIMISM_MAINNET) {
    return null;
  } else if (chainId === BLAST_SEPOLIA_TESTNET) {
    return null;
  } else if (chainId == MORPH_L2) {
    return null;
  } else if (chainId == MORPH_MAINNET) {
    return null;
  }

  throw new Error(`Unsupported chain ${chainId}`);
}
