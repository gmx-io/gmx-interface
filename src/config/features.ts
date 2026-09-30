import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, MEGAETH } from "./chains";

export function getIsV1Supported(chainId: number) {
  return [AVALANCHE, ARBITRUM].includes(chainId);
}

export function getIsExpressSupported(chainId: number) {
  return [AVALANCHE, ARBITRUM, ARBITRUM_SEPOLIA, MEGAETH].includes(chainId);
}
