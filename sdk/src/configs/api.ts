import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, AVALANCHE_FUJI, BOTANIX, ContractsChainId, MEGAETH } from "./chains";

const API_URLS: Record<ContractsChainId, string | undefined> = {
  [ARBITRUM]: "https://arbitrum.gmxapi.io/v1",
  [AVALANCHE]: "https://avalanche.gmxapi.io/v1",
  [AVALANCHE_FUJI]: undefined,
  [BOTANIX]: "https://botanix.gmxapi.io/v1",
  [ARBITRUM_SEPOLIA]: "https://gmx-api-arbitrum-sepolia-yp6pp.ondigitalocean.app/v1",
  [MEGAETH]: "https://megaeth.gmxapi.io/v1",
};

const API_FALLBACK_URLS: Record<ContractsChainId, string[]> = {
  [ARBITRUM]: ["https://arbitrum.gmxapi.ai/v1"],
  [AVALANCHE]: ["https://avalanche.gmxapi.ai/v1"],
  [AVALANCHE_FUJI]: [],
  [BOTANIX]: ["https://botanix.gmxapi.ai/v1"],
  [ARBITRUM_SEPOLIA]: [],
  [MEGAETH]: ["https://megaeth.gmxapi.ai/v1"],
};

export function getApiUrl(chainId: number) {
  return API_URLS[chainId];
}

export function getApiFallbackUrls(chainId: number): string[] {
  return API_FALLBACK_URLS[chainId] ?? [];
}

export function isApiSupported(chainId: number) {
  return getApiUrl(chainId) !== undefined;
}
