import { ARBITRUM, ARBITRUM_GOERLI, AVALANCHE, AVALANCHE_FUJI } from "./chains";

export function getIsSyntheticsSupported(chainId: number) {
  return [ARBITRUM, ARBITRUM_GOERLI, AVALANCHE_FUJI].includes(chainId);
}

export function getIsV1Supported(chainId: number) {
  return [AVALANCHE, ARBITRUM].includes(chainId);
}
