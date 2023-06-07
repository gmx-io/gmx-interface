import { ARBITRUM_GOERLI, AVALANCHE_FUJI } from "./chains";
import { isDevelopment } from "./env";

export function getIsSyntheticsSupported(chainId: number) {
  if (isDevelopment()) {
    return [AVALANCHE_FUJI, ARBITRUM_GOERLI].includes(chainId);
  }

  return false;
}
