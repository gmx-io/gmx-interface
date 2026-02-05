import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, AVALANCHE_FUJI, BOTANIX, ContractsChainId, MEGAETH } from "./chains";

const API_URLS: Record<ContractsChainId, string> = {
  [ARBITRUM]: "https://gmx-api-arbitrum-dev-ikpem.ondigitalocean.app/api/v1",

  [AVALANCHE]: "",

  [AVALANCHE_FUJI]: "",

  [BOTANIX]: "",

  [ARBITRUM_SEPOLIA]: "",

  [MEGAETH]: "",
};

export function getApiUrl(chainId: number) {
  return API_URLS[chainId];
}
