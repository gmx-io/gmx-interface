import { AVALANCHE_FUJI } from "./chains";
import { isDevelopment } from "./env";

export function getIsSyntheticsSupported(chainId: number) {
  if (isDevelopment()) {
    return [AVALANCHE_FUJI].includes(chainId);
  }

  return false;
}
