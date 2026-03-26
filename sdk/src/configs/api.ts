import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, AVALANCHE_FUJI, BOTANIX, ContractsChainId, MEGAETH } from "./chains";

const API_URLS: Record<ContractsChainId, string | undefined> = {
  [ARBITRUM]: "https://arbitrum-temp.gmxapi.ai/api/v1",

  [AVALANCHE]: "https://avalanche-temp.gmxapi.ai/api/v1",

  [AVALANCHE_FUJI]: undefined,

  [BOTANIX]: "https://botanix-temp.gmxapi.ai/api/v1",

  [ARBITRUM_SEPOLIA]: "https://gmx-api-arbitrum-sepolia-yp6pp.ondigitalocean.app/api/v1",

  [MEGAETH]: "https://megaeth-temp.gmxapi.ai/api/v1",
};

export function getApiUrl(chainId: number) {
  return API_URLS[chainId];
}

export function isApiSupported(chainId: number) {
  return getApiUrl(chainId) !== undefined;
}
