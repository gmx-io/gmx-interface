import { ARBITRUM, ARBITRUM_GOERLI, AVALANCHE, AVALANCHE_FUJI } from "./chains";

export function getIsSyntheticsSupported(chainId: number) {
  if (
    document.location.hostname.includes("testnet.gmx-interface.pages.dev") ||
    document.location.hostname.includes("app.gmxtest.io")
  ) {
    return [AVALANCHE_FUJI, ARBITRUM_GOERLI].includes(chainId);
  }

  return true;
}

export function getIsV1Supported(chainId: number) {
  return [AVALANCHE, ARBITRUM].includes(chainId);
}
