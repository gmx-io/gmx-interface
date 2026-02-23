import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, AVALANCHE_FUJI, BOTANIX, ContractsChainId, MEGAETH } from "./chains";

const API_URLS: Record<ContractsChainId, string | undefined> = {
  [ARBITRUM]: "https://gmx-api-arbitrum-2nlbk.ondigitalocean.app/api/v1",

  [AVALANCHE]: "https://gmx-api-avalanche-vxjas.ondigitalocean.app/api/v1",

  [AVALANCHE_FUJI]: undefined,

  [BOTANIX]: undefined,

  [ARBITRUM_SEPOLIA]: "https://gmx-api-arbitrum-sepolia-yp6pp.ondigitalocean.app/api/v1",

  [MEGAETH]: undefined,
};

export function getApiUrl(chainId: number) {
  return API_URLS[chainId];
}

export function isApiSupported(chainId: number) {
  return getApiUrl(chainId) !== undefined;
}
