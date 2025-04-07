import { getAccount } from "@wagmi/core";

import { getRainbowKitConfig } from "lib/wallets/rainbowKitConfig";

export function getRealChainId() {
  const chainId = getAccount(getRainbowKitConfig()).chainId;

  return chainId;
}
