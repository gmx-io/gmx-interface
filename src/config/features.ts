import { ARBITRUM, AVALANCHE } from "./chains";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getIsSyntheticsSupported(chainId: number) {
  return true;
}

export function getIsV1Supported(chainId: number) {
  return [AVALANCHE, ARBITRUM].includes(chainId);
}
