import { ARBITRUM, AVALANCHE, BOTANIX } from "./chains";

export function getIsV1Supported(chainId: number) {
  return [AVALANCHE, ARBITRUM].includes(chainId);
}

export function getIsExpressSupported(chainId: number) {
  return [AVALANCHE, ARBITRUM, BOTANIX].includes(chainId);
}

export function getIsV1Deployment() {
  return true;
  // return import.meta.env.VITE_APP_IS_V1_DEPLOYMENT === "true";
}
