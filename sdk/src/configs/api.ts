import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, AVALANCHE_FUJI, BOTANIX, ContractsChainId, MEGAETH } from "./chains";

export type ApiVersion = "v1" | "v2";

const API_BASE_URLS: Record<ContractsChainId, string | undefined> = {
  [ARBITRUM]: "https://arbitrum.gmxapi.io",
  [AVALANCHE]: "https://avalanche.gmxapi.io",
  [AVALANCHE_FUJI]: undefined,
  [BOTANIX]: "https://botanix.gmxapi.io",
  [ARBITRUM_SEPOLIA]: "https://gmx-api-arbitrum-sepolia-yp6pp.ondigitalocean.app",
  [MEGAETH]: "https://megaeth.gmxapi.io",
};

const API_FALLBACK_BASE_URLS: Record<ContractsChainId, string[]> = {
  [ARBITRUM]: ["https://arbitrum.gmxapi.ai"],
  [AVALANCHE]: ["https://avalanche.gmxapi.ai"],
  [AVALANCHE_FUJI]: [],
  [BOTANIX]: ["https://botanix.gmxapi.ai"],
  [ARBITRUM_SEPOLIA]: [],
  [MEGAETH]: ["https://megaeth.gmxapi.ai"],
};

export function getApiUrl(chainId: number, apiVersion: ApiVersion = "v1") {
  const apiBaseUrl = API_BASE_URLS[chainId];

  return apiBaseUrl ? `${apiBaseUrl}/${apiVersion}` : undefined;
}

export function getApiFallbackUrls(chainId: number, apiVersion: ApiVersion = "v1"): string[] {
  return (API_FALLBACK_BASE_URLS[chainId] ?? []).map((apiBaseUrl) => `${apiBaseUrl}/${apiVersion}`);
}

export function isApiSupported(chainId: number) {
  return getApiUrl(chainId) !== undefined;
}
