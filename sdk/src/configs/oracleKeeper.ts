import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, AVALANCHE_FUJI, BOTANIX, ContractsChainId } from "./chains";

export const ORACLE_FALLBACK_TRACKER_CONFIG = {
  trackInterval: 10 * 1000, // 10 secs
  checkTimeout: 10 * 1000, // 10 secs
  cacheTimeout: 5 * 60 * 1000, // 5 mins
  disableUnusedTrackingTimeout: 1 * 60 * 1000, // 1 mim
  failuresBeforeBan: {
    count: 3,
    window: 60 * 1000, // 1 min
    throttle: 2 * 1000, // 2 secs
  },
  setEndpointsThrottle: 5 * 1000, // 5 secs
  delay: 5000, // 5 secs
};
// TODO: fix arbitrum url after JIT is deployed
const ORACLE_KEEPER_URLS: Record<ContractsChainId, string> = {
  [ARBITRUM]: "https://arbitrum-api-fallback.gmxinfra2.io",

  [AVALANCHE]: "https://avalanche-api.gmxinfra.io",

  [AVALANCHE_FUJI]: "https://synthetics-api-avax-fuji-upovm.ondigitalocean.app",

  [BOTANIX]: "https://botanix-api.gmxinfra.io",

  [ARBITRUM_SEPOLIA]: "https://dolphin-app-a2dup.ondigitalocean.app",
};

const ORACLE_KEEPER_FALLBACK_URLS: Record<ContractsChainId, string[]> = {
  [ARBITRUM]: ["https://arbitrum-api-fallback.gmxinfra2.io", "https://arbitrum-api-fallback.gmxinfra2.io"],

  [AVALANCHE]: ["https://avalanche-api-fallback.gmxinfra.io", "https://avalanche-api-fallback.gmxinfra2.io"],

  [AVALANCHE_FUJI]: ["https://synthetics-api-avax-fuji.gmxinfra.io"],

  [BOTANIX]: ["https://botanix-api-fallback.gmxinfra.io", "https://botanix-api-fallback.gmxinfra2.io"],

  [ARBITRUM_SEPOLIA]: ["https://dolphin-app-a2dup.ondigitalocean.app"],
};

export function getOracleKeeperUrl(chainId: number) {
  const localOverride =
    typeof localStorage !== "undefined" ? localStorage.getItem("ORACLE_KEEPER_URL_OVERRIDE") : undefined;

  if (localOverride) {
    return localOverride;
  }

  if (!ORACLE_KEEPER_URLS[chainId]) {
    throw new Error(`No oracle keeper url for chain ${chainId}`);
  }

  return ORACLE_KEEPER_URLS[chainId];
}

export function getOracleKeeperFallbackUrls(chainId: number) {
  if (!ORACLE_KEEPER_FALLBACK_URLS[chainId]) {
    throw new Error(`No oracle keeper fallback urls for chain ${chainId}`);
  }

  return ORACLE_KEEPER_FALLBACK_URLS[chainId];
}
