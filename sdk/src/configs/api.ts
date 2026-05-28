import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, AVALANCHE_FUJI, BOTANIX, ContractsChainId, MEGAETH } from "./chains";

export type ApiEnvironment = "production" | "test";

const API_URLS: Record<ApiEnvironment, Record<ContractsChainId, string | undefined>> = {
  production: {
    [ARBITRUM]: "https://arbitrum.gmxapi.io",
    [AVALANCHE]: "https://avalanche.gmxapi.io",
    [AVALANCHE_FUJI]: undefined,
    [BOTANIX]: "https://botanix.gmxapi.io",
    [ARBITRUM_SEPOLIA]: "https://gmx-api-arbitrum-sepolia-yp6pp.ondigitalocean.app",
    [MEGAETH]: "https://megaeth.gmxapi.io",
  },
  test: {
    [ARBITRUM]: "https://arbitrum-test.gmxapi.ai",
    [AVALANCHE]: undefined,
    [AVALANCHE_FUJI]: undefined,
    [BOTANIX]: undefined,
    [ARBITRUM_SEPOLIA]: "https://arbitrum-sepolia-test.gmxapi.ai",
    [MEGAETH]: undefined,
  },
};

const API_FALLBACK_URLS: Record<ApiEnvironment, Record<ContractsChainId, string[]>> = {
  production: {
    [ARBITRUM]: ["https://arbitrum.gmxapi.ai"],
    [AVALANCHE]: ["https://avalanche.gmxapi.ai"],
    [AVALANCHE_FUJI]: [],
    [BOTANIX]: ["https://botanix.gmxapi.ai"],
    [ARBITRUM_SEPOLIA]: [],
    [MEGAETH]: ["https://megaeth.gmxapi.ai"],
  },
  test: {
    [ARBITRUM]: [],
    [AVALANCHE]: [],
    [AVALANCHE_FUJI]: [],
    [BOTANIX]: [],
    [ARBITRUM_SEPOLIA]: [],
    [MEGAETH]: [],
  },
};

export function getApiUrl(chainId: number, environment: ApiEnvironment = "production") {
  return API_URLS[environment][chainId];
}

export function getApiFallbackUrls(chainId: number, environment: ApiEnvironment = "production"): string[] {
  return API_FALLBACK_URLS[environment][chainId] ?? [];
}

export function isApiSupported(chainId: number, environment: ApiEnvironment = "production") {
  return getApiUrl(chainId, environment) !== undefined;
}
